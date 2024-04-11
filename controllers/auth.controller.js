const User = require('../models/user.model');
const authUtil = require('../util/authentication');
const validation = require('../util/validation');
const sessionFlash = require('../util/session-flash');

function getSignup(req, res) {
  let sessionData = sessionFlash.getSessionData(req);

  if (!sessionData) {
    sessionData = {
      email: '',
      confirmEmail: '',
      password: '',
      fullname: '',
      street: '',
      postal: '',
      city: '',
    };
  }

  res.render('customer/auth/signup', { inputData: sessionData });
}

async function signup(req, res, next) {
  const enteredData = {
    email: req.body.email,
    confirmEmail: req.body['confirm-email'],
    password: req.body.password,
    fullname: req.body.fullname,
    street: req.body.street,
    postal: req.body.postal,
    city: req.body.city,
  };

  if (
    !validation.userDetailsAreValid(
      req.body.email,
      req.body.password,
      req.body.fullname,
      req.body.street,
      req.body.postal,
      req.body.city
    ) ||
    !validation.emailIsConfirmed(req.body.email, req.body['confirm-email'])
  ) {
    sessionFlash.flashDataToSession(
      req,
      {
        errorMessage:
          'Please check your input. Password must be at least 6 character slong, postal code must be 5 characters long.',
        ...enteredData,
      },
      function () {
        res.redirect('/signup');
      }
    );
    return;
  }

  const user = new User(
    req.body.email,
    req.body.password,
    req.body.fullname,
    req.body.street,
    req.body.postal,
    req.body.city
  );

  try {
    const existsAlready = await user.existsAlready();

    if (existsAlready) {
      sessionFlash.flashDataToSession(
        req,
        {
          errorMessage: 'User exists already! Try logging in instead!',
          ...enteredData,
        },
        function () {
          res.redirect('/signup');
        }
      );
      return;
    }

    await user.signup();
  } catch (error) {
    next(error);
    return;
  }

  res.redirect('/login');
}

function getLogin(req, res) {
  let sessionData = sessionFlash.getSessionData(req);

  if (!sessionData) {
    sessionData = {
      email: '',
      password: '',
    };
  }

  res.render('customer/auth/login', { inputData: sessionData });
}

async function login(req, res, next) {
  const user = new User(req.body.email, req.body.password);
  let existingUser;
  try {
    existingUser = await user.getUserWithSameEmail();
  } catch (error) {
    next(error);
    return;
  }

  const sessionErrorData = {
    errorMessage:
      'Invalid credentials - please double-check your email and password!',
    email: user.email,
    password: user.password,
  };

  if (!existingUser) {
    sessionFlash.flashDataToSession(req, sessionErrorData, function () {
      res.redirect('/login');
    });
    return;
  }

  const passwordIsCorrect = await user.hasMatchingPassword(
    existingUser.password
  );

  if (!passwordIsCorrect) {
    sessionFlash.flashDataToSession(req, sessionErrorData, function () {
      res.redirect('/login');
    });
    return;
  }

  authUtil.createUserSession(req, existingUser, function () {
    res.redirect('/');
  });
}

function logout(req, res) {
  authUtil.destroyUserAuthSession(req);
  res.redirect('/login');
}

module.exports = {
  getSignup: getSignup,
  getLogin: getLogin,
  signup: signup,
  login: login,
  logout: logout,
};



/*

const authUtil = require('../util/authentication');
const validation = require('../util/validation');

const User = require('../models/user.model');
const sessionFlash = require('../util/session-flash');
const otpGenerator = require('otp-generator');
const twilio = require('twilio');

function getSignup(req, res) {
  let sessionData = sessionFlash.getSessionData(req);

  if (!sessionData) {
    sessionData = {
      phone: '',
      otp: '',
      password: '',
      fullname: '',
      street: '',
      postal: '',
      city: '',
    };
  }

  res.render('customer/auth/signup', { inputData: sessionData });
}

async function signup(req, res, next) {
  const enteredData = {
    phone: req.body.phone,
    password: req.body.password,
    fullname: req.body.fullname,
    street: req.body.street,
    postal: req.body.postal,
    city: req.body.city,
  };

  const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
  const phoneNumber = req.body.phone;

  const accountSid = 'AC66ef323a6b16eb254420d8deee409cc1';
  const authToken = '970256459dbc50c6ec6dfe03ba0b56ca';
  const client = new twilio(accountSid, authToken);

  try {
    await client.messages.create({
      body: `Your OTP is ${otp}. Enter this OTP to verify your account.`,
      from: '+12678882647', // Replace with your Twilio phone number
      to: phoneNumber
    });

    sessionFlash.flashDataToSession(req, { ...enteredData, otp }, function () {
      res.redirect('/otp-verification');
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
}

function getOTPVerification(req, res) {
  res.render('customer/auth/otp-verification');
}

async function verifyOTP(req, res, next) {
  const enteredOTP = req.body.otp;
  const storedOTP = req.session.flashData.otp;

  if (enteredOTP === storedOTP) {
    // OTP is valid, proceed with account creation
    const enteredData = req.session.flashData;
    delete enteredData.otp;

    const user = new User(
      enteredData.phone,
      enteredData.password,
      enteredData.fullname,
      enteredData.street,
      enteredData.postal,
      enteredData.city
    );

    try {
      const existsAlready = await user.existsAlready();

      if (existsAlready) {
        sessionFlash.flashDataToSession(
          req,
          {
            errorMessage: 'User exists already! Try logging in instead!',
            ...enteredData,
          },
          function () {
            res.redirect('/signup');
          }
        );
        return;
      }

      await user.signup();
    } catch (error) {
      next(error);
      return;
    }

    res.redirect('/login');
  } else {
    // OTP is invalid, show error message
    sessionFlash.flashDataToSession(req, {
      errorMessage: 'Invalid OTP. Please try again.',
      ...req.session.flashData,
    }, function () {
      res.redirect('/otp-verification');
    });
  }
}

function getLogin(req, res) {
  let sessionData = sessionFlash.getSessionData(req);

  if (!sessionData) {
    sessionData = {
      phone: '',
      password: '',
    };
  }

  res.render('customer/auth/login', { inputData: sessionData });
}

// async function login(req, res, next) {
//   // login logic remains the same
// }

// function logout(req, res) {
//   // logout logic remains the same
// }


async function login(req, res, next) {
  const user = new User(req.body.email, req.body.password);
  let existingUser;
  try {
    existingUser = await user.getUserWithSameEmail();
  } catch (error) {
    next(error);
    return;
  }

  const sessionErrorData = {
    errorMessage:
      'Invalid credentials - please double-check your email and password!',
    email: user.email,
    password: user.password,
  };

  if (!existingUser) {
    sessionFlash.flashDataToSession(req, sessionErrorData, function () {
      res.redirect('/login');
    });
    return;
  }

  const passwordIsCorrect = await user.hasMatchingPassword(
    existingUser.password
  );

  if (!passwordIsCorrect) {
    sessionFlash.flashDataToSession(req, sessionErrorData, function () {
      res.redirect('/login');
    });
    return;
  }

  authUtil.createUserSession(req, existingUser, function () {
    res.redirect('/');
  });
}

function logout(req, res) {
  authUtil.destroyUserAuthSession(req);
  res.redirect('/login');
}



module.exports = {
  getSignup: getSignup,
  getLogin: getLogin,
  signup: signup,
  login: login,
  logout: logout,
  getOTPVerification: getOTPVerification,
  verifyOTP: verifyOTP,
};


*/