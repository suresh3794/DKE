// Products page
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ category: 1 });
    res.render('products', { products });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load products' });
  }
});

// Product detail page
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('error', { message: 'Product not found' });
    }
    
    // Get related products from the same category
    const relatedProducts = await Product.find({ 
      category: product.category,
      _id: { $ne: product._id }
    }).limit(3);
    
    res.render('product-detail', { product, relatedProducts });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load product' });
  }
});