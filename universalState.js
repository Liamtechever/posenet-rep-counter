// universalState.js

// Global universal state object
const universalState = {
    posture: "unknown", // "standing", "squatting", "sitting", "lying down"
    movement: {
      walkingTowardCamera: false,
      armSwingRight: false,
      armSwingLeft: false,
    },
    keyMetrics: {
      leftKneeAngle: null,
      rightKneeAngle: null,
      leftLegVertical: null,
      rightLegVertical: null,
    }
  };
  
  // Calibration data (to be set during a T-pose)
  const calibrationData = {
    shoulderDistance: null, // baseline distance between left and right shoulders
    calibrated: false
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
   * calibrateTpose(pose)
   * When the user holds a T-pose, capture the baseline shoulder distance.
   */
  function calibrateTpose(pose) {
    const leftShoulder = pose.keypoints.find(k => k.part === "leftShoulder");
    const rightShoulder = pose.keypoints.find(k => k.part === "rightShoulder");
    if (leftShoulder && rightShoulder && leftShoulder.score > 0.5 && rightShoulder.score > 0.5) {
      calibrationData.shoulderDistance = distance(leftShoulder.position, rightShoulder.position);
      calibrationData.calibrated = true;
      console.log("Calibration complete. Shoulder distance:", calibrationData.shoulderDistance);
    }
  }
  
  /**
   * updateUniversalState(pose, previousPose)
   * Updates the universalState based on the current pose.
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
  
    // Compute vertical distances (knee to ankle)
    let leftLegVertical = null;
    let rightLegVertical = null;
    if (leftKnee && leftAnkle && leftKnee.score > 0.5 && leftAnkle.score > 0.5) {
      leftLegVertical = leftAnkle.position.y - leftKnee.position.y;
    }
    if (rightKnee && rightAnkle && rightKnee.score > 0.5 && rightAnkle.score > 0.5) {
      rightLegVertical = rightAnkle.position.y - rightKnee.position.y;
    }
  
    universalState.keyMetrics.leftKneeAngle = leftKneeAngle;
    universalState.keyMetrics.rightKneeAngle = rightKneeAngle;
    universalState.keyMetrics.leftLegVertical = leftLegVertical;
    universalState.keyMetrics.rightLegVertical = rightLegVertical;
  
    // Decide on posture using calibration data if available
    if (calibrationData.calibrated && calibrationData.shoulderDistance) {
      // Set thresholds relative to shoulder distance (e.g., 15%)
      let leftThreshold = calibrationData.shoulderDistance * 0.15;
      let rightThreshold = calibrationData.shoulderDistance * 0.15;
      
      if (leftLegVertical !== null && rightLegVertical !== null) {
        if (leftLegVertical < leftThreshold && rightLegVertical < rightThreshold) {
          universalState.posture = "standing";
        } else if (leftKneeAngle !== null && rightKneeAngle !== null) {
          if (leftKneeAngle < 100 && rightKneeAngle < 100) {
            universalState.posture = "squatting";
          } else {
            universalState.posture = "standing";
          }
        } else {
          universalState.posture = "unknown";
        }
      } else {
        universalState.posture = "unknown";
      }
    } else {
      // Fallback: use fixed thresholds if not calibrated
      if (leftKneeAngle && rightKneeAngle) {
        if (leftKneeAngle < 100 && rightKneeAngle < 100) {
          universalState.posture = "squatting";
        } else {
          universalState.posture = "standing";
        }
      } else {
        universalState.posture = "unknown";
      }
    }
  
    // Additional check: if the nose is very low, assume lying down.
    if (nose && nose.score > 0.5 && nose.position.y > 450) {
      universalState.posture = "lying down";
    }
  
    // --- Movement Detection (using previousPose if provided) ---
    if (previousPose) {
      const prevRightWrist = previousPose.keypoints.find(k => k.part === "rightWrist");
      const currRightWrist = pose.keypoints.find(k => k.part === "rightWrist");
      if (prevRightWrist && currRightWrist &&
          prevRightWrist.score > 0.5 && currRightWrist.score > 0.5) {
        let dx = currRightWrist.position.x - prevRightWrist.position.x;
        universalState.movement.armSwingRight = dx > 20;
      }
      const prevLeftWrist = previousPose.keypoints.find(k => k.part === "leftWrist");
      const currLeftWrist = pose.keypoints.find(k => k.part === "leftWrist");
      if (prevLeftWrist && currLeftWrist &&
          prevLeftWrist.score > 0.5 && currLeftWrist.score > 0.5) {
        let dx = currLeftWrist.position.x - prevLeftWrist.position.x;
        universalState.movement.armSwingLeft = dx < -20;
      }
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
  