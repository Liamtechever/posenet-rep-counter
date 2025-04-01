let net, video, canvas, ctx;
let repCount = 0;
let down = false;

async function setupCamera() {
  video = document.getElementById('video');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user' }
  });
  video.srcObject = stream;
  await new Promise(resolve => video.onloadedmetadata = resolve);
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

function drawKeypoints(keypoints) {
    ctx.save(); // Start safe drawing block
    ctx.fillStyle = "#00e5ff"; // Bright blue
    keypoints.forEach(k => {
      if (k.score > 0.5) {
        ctx.beginPath();
        ctx.arc(k.position.x, k.position.y, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    ctx.restore(); // End drawing block
  }
  

async function detectPose() {
  const pose = await net.estimateSinglePose(video, {
    flipHorizontal: false // we flip the canvas instead
  });

  console.log("Pose received:", pose); // ✅ Debug log
  console.log("Sample keypoint:", pose.keypoints[0]);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Flip canvas horizontally
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-canvas.width, 0);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawKeypoints(pose.keypoints);

  const leftShoulder = pose.keypoints.find(p => p.part === 'leftShoulder');
  const leftElbow = pose.keypoints.find(p => p.part === 'leftElbow');
  const leftWrist = pose.keypoints.find(p => p.part === 'leftWrist');

  if ([leftShoulder, leftElbow, leftWrist].every(p => p.score > 0.6)) {
    const angle = angleBetween(leftShoulder.position, leftElbow.position, leftWrist.position);

    if (angle < 45 && !down) {
      down = true;
    }
    if (angle > 160 && down) {
      down = false;
      repCount++;
      document.getElementById('repCount').innerText = `Reps: ${repCount}`;
    }
  }

  requestAnimationFrame(detectPose);
}

async function main() {
  await setupCamera();

  await new Promise(resolve => {
    if (video.readyState >= 3) resolve();
    else video.oncanplay = resolve;
  });

  canvas = document.getElementById('output');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx = canvas.getContext('2d');

  net = await posenet.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: 640, height: 480 },
    multiplier: 0.75
  });

  detectPose();
}

main();
