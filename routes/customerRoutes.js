const express = require('express');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Ensure this points to your db connection module
const generateSecretKey = require('../middlewares/generateSecretKey');
const verifyToken = require('../middlewares/verifyToken');


const router = express.Router();
const secretKey = generateSecretKey();


// router.set('view engine', 'ejs');
router.use(express.urlencoded({ extended: true }));
// router.use(bodyParser.urlencoded({ extended: false }));
router.use(express.json());
router.use(express.static('views'));
// router.use(cookieParser());



router.get('/sign_up', (req, res) => {
  res.render('customer_sign_up');
});

router.get('/sign_in', (req, res) => {
  res.render('customer_sign_in');
});

router.post('/sign_up', (req, res) => {
  const { shopname, email, phonenumber, divisions, district, policestation, shopaddress, password } = req.body;
  const dp = "images/businessman.png";

  if (!validator.isEmail(email)) {
    res.status(400).send('Invalid email address');
    return;
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    pool.query(
      'INSERT INTO customers (shopname, email, phonenumber, division, district, policestation, address, password, dp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [shopname, email, phonenumber, divisions, district, policestation, shopaddress, hashedPassword, dp],
      (error, results) => {
        if (error) {
          console.error('Error saving data to the database:', error);
          res.status(500).send('Error occurred. Please try again later.');
        } else {
          const token = jwt.sign({ email }, secretKey, { expiresIn: '1h' });
          res.cookie('token', token, { httpOnly: true, maxAge: 3600000 });
          res.redirect(`/customers/dashboard?email=${email}`);
        }
      }
    );
  });
});

router.post('/sign_in', (req, res) => {
  const { email, password } = req.body;

  if (!validator.isEmail(email)) {
    res.status(400).send('Invalid email address');
    return;
  }

  pool.query('SELECT * FROM customers WHERE email = ?', [email], (error, results) => {
    if (error) {
      console.error('Error Log In:', error);
      res.status(500).send('Error occurred. Please try again later.');
      return;
    }

    if (results.length === 0) {
      res.status(401).send('Invalid username or password.');
      return;
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        res.status(500).send('Error comparing passwords');
        return;
      }

      if (result) {
        const token = jwt.sign({ email }, secretKey, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 3600000 });
        res.redirect(`/customers/dashboard?email=${email}`);
      } else {
        res.status(401).send('Invalid username or password.');
      }
    });
  });
});

router.get('/dashboard', verifyToken, (req, res) => {
  const email = req.query.email;
  pool.query('SELECT * FROM products', (error, products) => {
    if (error) {
      return res.status(500).send('Error occurred. Please try again later.');
    }
    pool.query('SELECT * FROM customers WHERE email = ?', [email], (error, results) => {
      if (error) {
        res.status(500).send('Error occurred. Please try again later.');
      }
      res.render('customers', { email, products, dp: results[0].dp });
    });
  });
});

router.get('/profile', (req, res) => {
  const email = req.query.email;
  pool.query('SELECT * FROM customers WHERE email = ?', [email], (error, results) => {
    if (error) {
      res.status(500).send('Error occurred. Please try again later.');
      return;
    }
    const user = results[0];
    res.render('customers_profile', { ...user });
  });
});

router.get('/cart', (req, res) => {
  const email = req.query.email;
  pool.query('SELECT * FROM customers WHERE email = ?', [email], (error, results) => {
    if (error) {
      res.status(500).send('Error occurred. Please try again later.');
      return;
    }
    const user = results[0];
    pool.query('SELECT * FROM cart WHERE userEmail = ?', [email], (error, carts) => {
      if (error) {
        res.status(500).send('Error occurred. Please try again later.');
        return;
      }
      res.render('customers_cart', { ...user, carts });
    });
  });
});

router.get('/orders', (req, res) => {
  const email = req.query.email;
  pool.query('SELECT * FROM customers WHERE email = ?', [email], (error, results) => {
    if (error) {
      res.status(500).send('Error occurred. Please try again later.');
      return;
    }
    res.render('customer_orders', { email, dp: results[0].dp });
  });
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.render('customer_sign_in');
});

module.exports = router;
