import React from "react";

const InventarisDebug = () => {
  console.log("InventarisDebug component loaded");
  
  return (
    <div style={{ padding: "20px", backgroundColor: "#f0f0f0", minHeight: "100vh" }}>
      <h1 style={{ color: "#333", marginBottom: "20px" }}>
        🔧 Inventaris Debug Page
      </h1>
      
      <div style={{ 
        backgroundColor: "white", 
        padding: "20px", 
        borderRadius: "8px", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "20px"
      }}>
        <h2 style={{ color: "#2563eb", marginBottom: "10px" }}>Status Check</h2>
        <p>✅ Component loaded successfully</p>
        <p>✅ React is working</p>
        <p>✅ Routing is working</p>
        <p>✅ Basic styling is working</p>
      </div>

      <div style={{ 
        backgroundColor: "white", 
        padding: "20px", 
        borderRadius: "8px", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "20px"
      }}>
        <h2 style={{ color: "#dc2626", marginBottom: "10px" }}>Next Steps</h2>
        <p>1. Check browser console for errors</p>
        <p>2. Verify all imports are working</p>
        <p>3. Test component rendering</p>
        <p>4. Check network requests</p>
      </div>

      <div style={{ 
        backgroundColor: "#fef3c7", 
        padding: "20px", 
        borderRadius: "8px", 
        border: "1px solid #f59e0b"
      }}>
        <h2 style={{ color: "#92400e", marginBottom: "10px" }}>Debug Info</h2>
        <p><strong>Current Time:</strong> {new Date().toLocaleString()}</p>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>URL:</strong> {window.location.href}</p>
        <p><strong>React Version:</strong> {React.version}</p>
      </div>
    </div>
  );
};

export default InventarisDebug;
