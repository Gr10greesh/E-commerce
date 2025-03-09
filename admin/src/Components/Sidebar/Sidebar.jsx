import React from 'react';
import './Sidebar.css';
import { Link } from 'react-router-dom';
import add_product_icon from '../../assets/Product_Cart.svg';
import list_product_icon from '../../assets/Product_list_icon.svg';

const Sidebar = () => {
  // Array of sidebar items
  const sidebarItems = [
    {
      path: '/addproduct',
      icon: add_product_icon,
      text: 'Add Product',
      alt: 'Add Product Icon',
    },
    {
      path: '/listproduct',
      icon: list_product_icon,
      text: 'Product List',
      alt: 'Product List Icon',
    },
  ];

  return (
    <div className='sidebar'>
      {sidebarItems.map((item, index) => (
        <Link to={item.path} className="sidebar-link" key={index}>
          <div className="sidebar-item">
            <img src={item.icon} alt={item.alt} />
            <p>{item.text}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Sidebar;