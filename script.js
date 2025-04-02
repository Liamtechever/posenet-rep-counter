// script.js

let net, video, canvas, ctx;
let repCount = 0;
let down = false;
let previousPose = null;
let isCalibrated = false; // Flag to track if calibration is done

async function setupCamera() {
  video = document.getElementById("video");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { width: 600, height: 500, facingMode: "user" }
  });
  video.srcObject = stream;
  await new Promise(resolve => (video.onloadedmetadata = resolve));
  video.play();
}

function angleBetween(p1, p2, p3) {
  const radians = Math.acos(
    ((p2.x - p1.x) * (p2.x - p3.x) + (p2.y - p1.y) * (p2.y - p3.y)) /
    (Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) *
     Math.sqrt((p2.x - p3.x) ** 2 + (p2.y - p3.y) ** 2))
  );
  return radians * (180 / Math.PI);
}

function drawVideoAndKeypoints(pose) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  pose.keypoints.forEach(k => {
    if (k.score > 0.5) {
      ctx.beginPath();
      ctx.arc(k.position.x, k.position.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#00e5ff";
      ctx.fill();
    }
  });
}

async function detectPose() {
  const pose = await net.estimateSinglePose(video, { flipHorizontal: false });

  // Calibration Phase:
  if (!isCalibrated) {
    const leftShoulder = pose.keypoints.find(k => k.part === "leftShoulder");
    const rightShoulder = pose.keypoints.find(k => k.part === "rightShoulder");
    const leftWrist = pose.keypoints.find(k => k.part === "leftWrist");
    const rightWrist = pose.keypoints.find(k => k.part === "rightWrist");
    if (leftShoulder && rightShoulder && leftWrist && rightWrist &&
        leftShoulder.score > 0.5 && rightShoulder.score > 0.5 &&
        leftWrist.score > 0.5 && rightWrist.score > 0.5) {
      let leftDist = distance(leftShoulder.position, leftWrist.position);
      let rightDist = distance(rightShoulder.position, rightWrist.position);
      // If both distances are above 80 pixels, assume T-pose for calibration
      if (leftDist > 80 && rightDist > 80) {
        calibrateTpose(pose); // Defined in universalState.js
        isCalibrated = true;
        document.getElementById("feedback").innerText = "Calibration complete. Standing posture set.";
      } else {
        document.getElementById("feedback").innerText = "Please hold a T-pose for calibration.";
      }
    }
  }
  
  // Update universal state with the current and previous poses
  updateUniversalState(pose, previousPose);
  console.log("Universal State:", universalState);
  
  // Update UI with the current posture
  document.getElementById("postureStatus").innerText = "Current posture: " + universalState.posture;
  
  drawVideoAndKeypoints(pose);
  
  // Example rep counting (using left arm as an example)
  const leftShoulder = pose.keypoints.find(p => p.part === "leftShoulder");
  const leftElbow = pose.keypoints.find(p => p.part === "leftElbow");
  const leftWrist = pose.keypoints.find(p => p.part === "leftWrist");
  
  if ([leftShoulder, leftElbow, leftWrist].every(p => p.score > 0.6)) {
    const angle = angleBetween(
      leftShoulder.position,
      leftElbow.position,
      leftWrist.position
    );
    if (angle < 45 && !down) {
      down = true;
    }
    if (angle > 160 && down) {
      down = false;
      repCount++;
      document.getElementById("repCount").innerText = `Reps: ${repCount}`;
    }
  }
  
  previousPose = pose;
  requestAnimationFrame(detectPose);
}

async function main() {
  await setupCamera();
  canvas = document.getElementById("output");
  ctx = canvas.getContext("2d");
  
  net = await posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: { width: 600, height: 500 },
    multiplier: 0.75,
  });
  
  detectPose();
}

main();
