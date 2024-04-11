const express = require('express');

const authController = require('../controllers/auth.controller');

const router = express.Router();

router.get('/signup', authController.getSignup);

router.post('/signup', authController.signup);

//  router.get('/verify-otp', authController.getOTPVerification);

//  router.post('/verify-otp', authController.verifyOTP);

router.get('/login', authController.getLogin);

router.post('/login', authController.login);

router.post('/logout', authController.logout);

module.exports = router;