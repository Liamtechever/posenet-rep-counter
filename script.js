// Get DOM elements
const video = document.getElementById("video");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

// Set up the camera with the desired dimensions
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 600, height: 500 },
    audio: false
  });
  video.srcObject = stream;
  await new Promise(resolve => video.onloadedmetadata = resolve);
  video.play();
}

// Draw keypoints on the canvas
function drawKeypoints(keypoints) {
  // Clear the canvas each frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  keypoints.forEach(k => {
    if (k.score > 0.5) {
      ctx.beginPath();
      ctx.arc(k.position.x, k.position.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#00e5ff";
      ctx.fill();
    }
  });
}

// Continuously detect pose and draw keypoints
async function detectPoseInRealTime(net) {
  async function poseDetectionFrame() {
    const pose = await net.estimateSinglePose(video, { flipHorizontal: false });
    drawKeypoints(pose.keypoints);
    requestAnimationFrame(poseDetectionFrame);
  }
  poseDetectionFrame();
}

// Main function to set up camera, load PoseNet, and start detection
async function main() {
  await setupCamera();
  // Ensure canvas dimensions match the video dimensions
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const net = await posenet.load(); // Load PoseNet model
  detectPoseInRealTime(net);
}

main();
