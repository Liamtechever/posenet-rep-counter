let net, video, canvas, ctx;
let repCount = 0;
let down = false;
let previousPose = null; // To hold the previous pose for movement comparisons

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
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw the current video frame onto the canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Draw each keypoint if its score is high enough
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
  // Estimate the current pose from the video feed
  const pose = await net.estimateSinglePose(video, { flipHorizontal: false });

  // Update the universal state using the current and previous poses.
  // (The updateUniversalState function should be defined in universalState.js.)
  updateUniversalState(pose, previousPose);
  console.log("Universal State:", universalState);

  // Draw the video frame and keypoints on the canvas
  drawVideoAndKeypoints(pose);

  // Simple rep counting logic (example using left arm angles)
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

  // Save the current pose to compare in the next frame
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
