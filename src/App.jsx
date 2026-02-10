import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "./Components/AdminLayout";
import Dashboard from "./Pages/Dashboard";
import Users from "./Pages/Users";
import Products from "./Pages/Products";
import Categories from "./Pages/Categories";
import Orders from "./Pages/Orders";
import { Toaster } from "react-hot-toast";
import Login from "./Pages/Login";
import AddProduct from "./Pages/AddProduct";
import Offers from "./Pages/Offers";
import Banners from "./Pages/Banners";

function App() {
  return (
    <BrowserRouter>
        <Toaster position="top-right" />
      <Routes>
           <Route path="/login" element={<Login/>}/>
        <Route element={<AdminLayout/>}>
          <Route path="/" element={<Dashboard/>} />
          <Route path="/users" element={<Users/>} />
          <Route path="/products" element={<Products/>} />
          <Route path="/categories" element={<Categories/>} />
          <Route path="/add" element={<AddProduct/>}/>
          <Route path="/orders" element={<Orders/>} />
          <Route path="/offers" element={<Offers/>} />
           <Route path="/banner" element={<Banners/>} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
