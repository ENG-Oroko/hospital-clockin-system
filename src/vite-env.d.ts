/// <reference types="vite/client" />

// Add this to handle CSS imports
declare module '*.css' {
  const content: string;
  export default content;
}

// If you're using CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}