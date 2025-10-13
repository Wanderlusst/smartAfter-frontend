"use client";
import React from "react";

export default function StyleTest() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Inline Style Test</h2>
      
      {/* Test 1: Basic inline styles */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Test 1: Basic Inline Styles</h3>
        <div 
          style={{
            backgroundColor: 'red',
            color: 'white',
            padding: '20px',
            border: '2px solid blue',
            width: '200px',
            height: '100px'
          }}
          className="mb-2"
        >
          This should have red background, white text, blue border
        </div>
      </div>

      {/* Test 2: Inline styles with Tailwind classes */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Test 2: Inline + Tailwind</h3>
        <div 
          style={{
            backgroundColor: 'green',
            color: 'white',
            padding: '20px'
          }}
          className="bg-blue-500 text-black p-4 mb-2"
        >
          Inline styles should override Tailwind (green bg, white text)
        </div>
      </div>

      {/* Test 3: Important inline styles */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Test 3: Important Styles</h3>
        <div 
          style={{
            backgroundColor: 'purple !important',
            color: 'yellow !important',
            padding: '20px !important'
          }}
          className="bg-red-500 text-white p-2 mb-2"
        >
          Important inline styles should override everything
        </div>
      </div>

      {/* Test 4: Iframe style test */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Test 4: Iframe Styles</h3>
        <div className="border border-gray-300 p-4">
          <iframe
            src="about:blank"
            style={{
              width: '100%',
              height: '200px',
              border: '3px solid orange',
              backgroundColor: 'lightblue'
            }}
            className="w-full h-48 border-2 border-red-500"
          />
        </div>
      </div>
    </div>
  );
} 