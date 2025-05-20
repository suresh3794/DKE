// Admin login page
router.get('/login', (req, res) => {
  console.log('Admin login route accessed');
  
  // Don't redirect if already on login page
  // This prevents redirect loops
  
  const filePath = path.join(__dirname, '../public/admin/login.html');
  console.log('Serving admin login file:', filePath);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    console.error('Admin login file not found:', filePath);
    return res.status(404).send('Admin login page not found');
  }
});

// Admin home route
router.get('/', (req, res) => {
  console.log('Admin route accessed');
  
  if (req.session && req.session.isAdmin) {
    console.log('User is authenticated, redirecting to dashboard');
    return res.redirect('/admin/dashboard');
  }
  
  console.log('User is not authenticated, redirecting to login');
  return res.redirect('/admin/login');
});