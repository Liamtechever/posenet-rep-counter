// universalState.js

// Global universal state object
const universalState = {
    posture: "unknown", // "standing", "squatting", "lying down"
    movement: {
      walkingTowardCamera: false,
      armSwingRight: false,
      armSwingLeft: false,
      // Additional movement flags can be added here
    },
    keyMetrics: {
      leftKneeAngle: null,
      rightKneeAngle: null,
      // You can add other computed values (e.g., shoulder distance) here
    }
  };
  
  // Helper: Calculate the angle between three points (in degrees)
  function calculateAngle(a, b, c) {
    const radians = Math.acos(
      ((b.x - a.x) * (b.x - c.x) + (b.y - a.y) * (b.y - c.y)) /
      (Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) *
       Math.sqrt((b.x - c.x) ** 2 + (b.y - c.y) ** 2))
    );
    return radians * (180 / Math.PI);
  }
  
  // Helper: Euclidean distance between two points
  function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }
  
  /**
   * updateUniversalState(pose, previousPose)
   *  - pose: the current PoseNet output
   *  - previousPose (optional): the previous frame’s pose (to detect movement)
   *
   * Returns the updated universalState object.
   */
  function updateUniversalState(pose, previousPose) {
    // --- Posture Detection ---
    const leftHip = pose.keypoints.find(k => k.part === "leftHip");
    const leftKnee = pose.keypoints.find(k => k.part === "leftKnee");
    const leftAnkle = pose.keypoints.find(k => k.part === "leftAnkle");
    const rightHip = pose.keypoints.find(k => k.part === "rightHip");
    const rightKnee = pose.keypoints.find(k => k.part === "rightKnee");
    const rightAnkle = pose.keypoints.find(k => k.part === "rightAnkle");
    const nose = pose.keypoints.find(k => k.part === "nose");
  
    let leftKneeAngle = null;
    let rightKneeAngle = null;
  
    if (leftHip && leftKnee && leftAnkle &&
        leftHip.score > 0.5 && leftKnee.score > 0.5 && leftAnkle.score > 0.5) {
      leftKneeAngle = calculateAngle(leftHip.position, leftKnee.position, leftAnkle.position);
    }
    if (rightHip && rightKnee && rightAnkle &&
        rightHip.score > 0.5 && rightKnee.score > 0.5 && rightAnkle.score > 0.5) {
      rightKneeAngle = calculateAngle(rightHip.position, rightKnee.position, rightAnkle.position);
    }
  
    // If both knees are bent significantly, assume squatting; otherwise, standing.
    if (leftKneeAngle && rightKneeAngle) {
      if (leftKneeAngle < 100 && rightKneeAngle < 100) {
        universalState.posture = "squatting";
      } else {
        universalState.posture = "standing";
      }
    }
  
    // If the nose is very low (near the bottom of the canvas), assume lying down.
    if (nose && nose.score > 0.5) {
      if (nose.position.y > 450) {
        universalState.posture = "lying down";
      }
    }
  
    // Store computed angles for debugging or further logic
    universalState.keyMetrics.leftKneeAngle = leftKneeAngle;
    universalState.keyMetrics.rightKneeAngle = rightKneeAngle;
  
    // --- Movement Detection (using previousPose if provided) ---
    if (previousPose) {
      // Detect right arm swing
      const prevRightWrist = previousPose.keypoints.find(k => k.part === "rightWrist");
      const currRightWrist = pose.keypoints.find(k => k.part === "rightWrist");
      if (prevRightWrist && currRightWrist &&
          prevRightWrist.score > 0.5 && currRightWrist.score > 0.5) {
        let dx = currRightWrist.position.x - prevRightWrist.position.x;
        universalState.movement.armSwingRight = dx > 20; // adjust threshold as needed
      }
      // Detect left arm swing
      const prevLeftWrist = previousPose.keypoints.find(k => k.part === "leftWrist");
      const currLeftWrist = pose.keypoints.find(k => k.part === "leftWrist");
      if (prevLeftWrist && currLeftWrist &&
          prevLeftWrist.score > 0.5 && currLeftWrist.score > 0.5) {
        let dx = currLeftWrist.position.x - prevLeftWrist.position.x;
        universalState.movement.armSwingLeft = dx < -20;
      }
      // Detect walking toward the camera by comparing shoulder distances
      const prevLeftShoulder = previousPose.keypoints.find(k => k.part === "leftShoulder");
      const prevRightShoulder = previousPose.keypoints.find(k => k.part === "rightShoulder");
      const currLeftShoulder = pose.keypoints.find(k => k.part === "leftShoulder");
      const currRightShoulder = pose.keypoints.find(k => k.part === "rightShoulder");
      if (prevLeftShoulder && prevRightShoulder && currLeftShoulder && currRightShoulder) {
        const prevDistance = distance(prevLeftShoulder.position, prevRightShoulder.position);
        const currDistance = distance(currLeftShoulder.position, currRightShoulder.position);
        universalState.movement.walkingTowardCamera = (currDistance > prevDistance + 10);
      }
    }
  
    return universalState;
  }
  
  console.log("Loaded universalState.js");
  