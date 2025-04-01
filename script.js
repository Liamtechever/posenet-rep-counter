console.log("Script loaded!");


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

async function detectPose() {
  const pose = await net.estimateSinglePose(video, {
    flipHorizontal: true
  });

  drawKeypoints(pose.keypoints, 0.6, ctx);
  drawSkeleton(pose.keypoints, 0.6, ctx);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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


function drawKeypoints(keypoints, minConfidence, ctx) {
    keypoints.forEach(keypoint => {
      if (keypoint.score > minConfidence) {
        const { y, x } = keypoint.position;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    });
  }
  
  function drawSkeleton(keypoints, minConfidence, ctx) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence);
    adjacentKeyPoints.forEach(([from, to]) => {
      ctx.beginPath();
      ctx.moveTo(from.position.x, from.position.y);
      ctx.lineTo(to.position.x, to.position.y);
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }


async function main() {
  await setupCamera();
  canvas = document.getElementById('output');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx = canvas.getContext('2d');

  net = await posenet.load();
  detectPose();
}

main();
