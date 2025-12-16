const express = require("express");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public")); 
app.use("/html", express.static(path.join(__dirname, "public/views"))); 
app.use("/recibos", express.static(path.join(__dirname, "public/recibos"))); 

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
      sameSite: "lax",
    }, 
  })
);

app.use("/auth", require("./routes/auth"));
app.use("/api/pagos", require("./routes/pagos")); 
app.use("/api/socios", require("./routes/socios"));


app.get("/", (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, "public/views/menu.html"));
  } else {
    res.sendFile(path.join(__dirname, "public/views/login.html"));
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
