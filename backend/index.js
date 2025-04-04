const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path"); // Import the path module
const { type } = require("os");

const app = express();
const port = 4001;

// Middleware
app.use(express.json());
app.use(cors());

// User Schema and Model
const userSchema = new mongoose.Schema({
  phonenumber: String,
  email: String,
  password: String,
});

// Product Schema and Model
const Product = mongoose.model("Product",{
  id:{
    type:Number,
    required:true,
  },
  name:{
    type:String,
    required:true,
  },
  image:{
    type:String,
    required:true,
  },
  category:{
    type:String,
    required:true,
  },
  new_price:{
    type:Number,
    required:true,
  },
  old_price:{
    type:Number,
    required:true,
  },
  date:{
    type:Date,
    default:Date.now,
  },
  available:{
    type:Boolean,
    default:true,
  },

})
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
    },
  ],
})

const Cart = mongoose.model("Cart", cartSchema);


app.post("/update-cart", async (req, res) => {
  try {
    const token = req.header("auth-token");
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, "secret_ecom");
    const userId = decoded.user.id;
    const { cartItems } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Use `_id` (ObjectId) instead of `id` (number)
    cart.items = Object.keys(cartItems).map((productId) => {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error(`Invalid productId: ${productId}`);
      }
      return {
        productId: new mongoose.Types.ObjectId(productId),
        quantity: cartItems[productId],
      };
    });

    await cart.save();
    res.json({ success: true, message: "Cart updated", cart });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});



app.get("/cart", async (req, res) => {
  try {
    const token = req.header("auth-token");
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, "secret_ecom");
    const userId = decoded.user.id;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    res.json({ success: true, items: cart.items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post("/addproduct", async (req, res) => {
  try {
    // Fetch the maximum product ID
    const maxIdProduct = await Product.findOne().sort({ id: -1 });
    const newId = maxIdProduct ? maxIdProduct.id + 1 : 1; // If no products exist, start with ID 1

    const product = new Product({
      id: newId, // Use the new ID
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
    });

    await product.save();
    console.log("Product Saved");
    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (err) {
    console.error("Error saving product:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/category/:category', async (req, res) => {
  const { category } = req.params;

  try {
    const products = await Product.find({ category: category.toLowerCase() });

    if (!products.length) {
      return res.status(404).json({ message: `No products found in category '${category}'.` });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.get("/maxproductid", async (req, res) => {
  try {
    const maxIdProduct = await Product.findOne().sort({ id: -1 }); // Find the product with the highest id
    const maxId = maxIdProduct ? maxIdProduct.id : 0; // If no products exist, default to 0
    res.json({ maxId });
  } catch (err) {
    console.error("Error fetching max product ID:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/allproducts", async (req, res) => {
  try {
    const products = await Product.find({}); // Fetch all products from the database
    res.json(products); // Send the products as a JSON response
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



app.get("/product/:id", async (req, res) => {
  try {
    const productId = parseInt(req.params.id); // Convert to number

    // Ensure the ID is a valid number
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    const product = await Product.findOne({ id: productId }); // Query by `id` (Number)
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post("/removeproduct", async (req, res) => {
  const { id } = req.body; // Get the product ID from the request body

  try {
    await Product.findOneAndDelete({ id: id }); // Delete the product by ID
    res.json({ success: true, message: "Product removed successfully" });
  } catch (err) {
    console.error("Error removing product:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Database Connection with MongoDB
mongoose
  .connect("mongodb+srv://johncarliblue:gr10greesh@cluster0.qig4n.mongodb.net/e-commerce")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const User = mongoose.model("User", userSchema);

// Image Storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images", // Corrected destination path
  filename: (req, file, cb) => {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

// Creating Upload Endpoint for images
app.use("/images", express.static("upload/images")); // Serve static files from the correct directory

app.post("/upload", upload.single("product"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: 0, message: "No file uploaded" });
  }

  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

// Signup Endpoint
app.post("/signup", async (req, res) => {
  const { phonenumber, email, password } = req.body;

  if (!phonenumber || !email || !password) {
    return res.status(400).json({ success: false, errors: "All fields are required" });
  }

  try {
    let emailCheck = await User.findOne({ email: email });
    if (emailCheck) {
      return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
    }

    let phoneCheck = await User.findOne({ phonenumber: phonenumber });
    if (phoneCheck) {
      return res.status(400).json({ success: false, errors: "Existing user found with same phone number" });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      phonenumber,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    const data = {
      user: {
        id: newUser.id,
      },
    };

    const token = jwt.sign(data, "secret_ecom", { expiresIn: "1h" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
  }
});

// Login Endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, errors: "All fields are required" });
  }

  try {
    // Check if the user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, errors: "User not found" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, errors: "Incorrect password" });
    }

    // Create JWT token
    const data = {
      user: {
        id: user.id,
      },
    };

    const token = jwt.sign(data, "secret_ecom", { expiresIn: "1h" });

    // Return the success response with the token
    res.json({ success: true, token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
  }
});

// Test API
app.get("/", (req, res) => {
  res.send("Express App is Running");
});

// Start Server
app.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on Port " + port);
  } else {
    console.log("Error: " + error);
  }
});







