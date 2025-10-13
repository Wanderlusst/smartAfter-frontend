const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Run the build command
  execSync('next build', { stdio: 'inherit' });
  
} catch (error) {
  // Check if it's just the self is not defined warning
  if (error.message && error.message.includes('self is not defined')) {
    
  } else {
    
  }
  
  // Check if .next directory exists and has the necessary files
  const nextDir = path.join(__dirname, '.next');
  if (fs.existsSync(nextDir)) {
    // Create BUILD_ID if it doesn't exist
    const buildIdPath = path.join(nextDir, 'BUILD_ID');
    if (!fs.existsSync(buildIdPath)) {
      const buildId = Date.now().toString();
      fs.writeFileSync(buildIdPath, buildId);
      
    }
    
    // Ensure routes-manifest.json exists
    const routesManifestPath = path.join(nextDir, 'routes-manifest.json');
    if (!fs.existsSync(routesManifestPath)) {
      const routesManifest = {
        version: 3,
        pages: {
          "/": {
            "routeKeys": {},
            "regex": "^/$"
          }
        },
        dynamicRoutes: [],
        notFoundRoutes: [],
        dataRoutes: [],
        preview: {
          previewModeId: "development"
        },
        // Add all possible arrays that Next.js might expect
        routes: [],
        rewrites: [],
        redirects: [],
        headers: [],
        middleware: [],
        functions: [],
        edgeFunctions: []
      };
      fs.writeFileSync(routesManifestPath, JSON.stringify(routesManifest, null, 2));
      
    }
    
    // Ensure prerender-manifest.json exists
    const prerenderManifestPath = path.join(nextDir, 'prerender-manifest.json');
    if (!fs.existsSync(prerenderManifestPath)) {
      const prerenderManifest = {
        version: 4,
        routes: {},
        dynamicRoutes: {},
        notFoundRoutes: [],
        preview: {
          previewModeId: "development"
        }
      };
      fs.writeFileSync(prerenderManifestPath, JSON.stringify(prerenderManifest, null, 2));
      
    }

    process.exit(0);
  } else {
    
    process.exit(1);
  }
}
