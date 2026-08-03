/**
 * proctorController.js — Camera Proctoring REST Handlers
 *
 * Routes:
 *   GET  /api/query/admin/test/:id/proctor/students  — active students in Socket.IO registry
 *   GET  /api/query/admin/test/:id/proctor/violations — camera violation summary per student
 */

const Submission = require('../models/submission');
const { broadcastEvent } = require('./eventController');
const { getStudentsInTest } = require('../services/socketService');

/**
 * GET /api/query/admin/test/:id/proctor/students
 * Returns currently connected students for the admin monitoring grid.
 * Data comes from the in-memory Socket.IO registry (no DB query).
 */
exports.getActiveProctorStudents = (req, res) => {
  try {
    const { id: testId } = req.params;
    const students = getStudentsInTest(testId);
    res.json(students);
  } catch (error) {
    console.error('getActiveProctorStudents Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/query/admin/test/:id/proctor/violations
 * Returns camera violation counts grouped by candidate for a test.
 * Aggregates from the Submission model.
 */
exports.getCameraViolationSummary = async (req, res) => {
  try {
    const { id: testId } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ message: 'Invalid test ID' });
    }

    const cameraViolationTypes = ['camera_multiple_faces', 'camera_no_face', 'camera_blocked'];

    const submissions = await Submission.find(
      { testId: new mongoose.Types.ObjectId(testId) },
      'candidateName candidateEmail violations'
    ).lean();

    const summary = submissions.map((sub) => {
      const cameraViolations = (sub.violations || []).filter(
        (v) => cameraViolationTypes.includes(v.type)
      );

      const byType = {
        camera_multiple_faces: 0,
        camera_no_face: 0,
        camera_blocked: 0,
      };

      cameraViolations.forEach((v) => {
        if (byType[v.type] !== undefined) byType[v.type]++;
      });

      return {
        candidateEmail: sub.candidateEmail,
        candidateName: sub.candidateName,
        totalCameraViolations: cameraViolations.length,
        byType,
        lastViolation: cameraViolations.length > 0
          ? cameraViolations[cameraViolations.length - 1].timestamp
          : null,
      };
    });

    // Sort by most violations first
    summary.sort((a, b) => b.totalCameraViolations - a.totalCameraViolations);

    res.json(summary);
  } catch (error) {
    console.error('getCameraViolationSummary Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
