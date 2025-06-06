import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva'; 
import { io } from 'socket.io-client';

import './App.css';

const socket = io('https://hs-collaborative-whiteboard-backend.onrender.com'); 

function App() {
  
  const [elements, setElements] = useState([]);
  const isDrawing = useRef(false);

 
  const currentElementId = useRef(null); 
  const startPos = useRef({ x: 0, y: 0 }); 

  const stageRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000'); 
  const [strokeWidth, setStrokeWidth] = useState(5);

  const [fillColor, setFillColor] = useState('transparent');


  const [myUserId, setMyUserId] = useState(null);
  const [myUsername, setMyUsername] = useState('');
  const [myPresenceColor, setMyPresenceColor] = useState('');
  const [activeUsers, setActiveUsers] = useState({});

  // Canvas dimensions (unchanged, handled by useLayoutEffect)
  const [stageWidth, setStageWidth] = useState(1);
  const [stageHeight, setStageHeight] = useState(1);

  // --- Effect for Socket.IO Listeners ---
  useEffect(() => {
    socket.on('current-user-info', (userInfo) => {
      setMyUserId(userInfo.id);
      setMyUsername(userInfo.username);
      setMyPresenceColor(userInfo.color);
    });

    socket.on('active-users-list', (users) => {
      const usersMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      setActiveUsers(usersMap);
    });

    socket.on('user-connected', (user) => {
      setActiveUsers((prevUsers) => ({ ...prevUsers, [user.id]: user }));
    });

    socket.on('user-updated', (user) => {
      setActiveUsers((prevUsers) => ({ ...prevUsers, [user.id]: user }));
    });

    socket.on('user-disconnected', (userId) => {
      setActiveUsers((prevUsers) => {
        const newUsers = { ...prevUsers };
        delete newUsers[userId];
        return newUsers;
      });
    });


    socket.on('load-drawing', (history) => {
      setElements(history);
    });

    socket.on('element-update', (updatedElement) => {
      setElements((prevElements) => {
        const existingIndex = prevElements.findIndex(el => el.id === updatedElement.id);
        if (existingIndex !== -1) {

          const newElements = [...prevElements];
          newElements[existingIndex] = updatedElement; 
          return newElements;
        } else {
          
          return [...prevElements, updatedElement];
        }
      });
    });

    socket.on('clear-canvas', () => {
      setElements([]);
    });

    return () => {

      socket.off('current-user-info');
      socket.off('active-users-list');
      socket.off('user-connected');
      socket.off('user-updated');
      socket.off('user-disconnected');
      socket.off('load-drawing');
      socket.off('element-update'); 
      socket.off('clear-canvas');
    };
  }, []);


  useLayoutEffect(() => {
    const updateCanvasDimensions = () => {
      if (canvasContainerRef.current) {
        const newWidth = canvasContainerRef.current.offsetWidth;
        const newHeight = canvasContainerRef.current.offsetHeight;
        setStageWidth(newWidth);
        setStageHeight(newHeight);
      }
    };
    updateCanvasDimensions(); 
    window.addEventListener('resize', updateCanvasDimensions);
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, [canvasContainerRef.current]);

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    startPos.current = e.target.getStage().getPointerPosition(); 
    const id = Date.now(); // Unique ID for the new element
    currentElementId.current = id; 

    let newElement;
    const commonProps = {
      id,
      tool, 
      userId: myUserId,
      username: myUsername,
      userColor: myPresenceColor,
      stroke: color,
      strokeWidth,
    };

    if (tool === 'pen' || tool === 'eraser') {
      newElement = {
        type: 'line',
        points: [startPos.current.x, startPos.current.y],
        ...commonProps,
      };
    } else if (tool === 'rect') {
      newElement = {
        type: 'rect',
        x: startPos.current.x,
        y: startPos.current.y,
        width: 0,
        height: 0,
        fill: fillColor, // Apply fill color for shapes
        ...commonProps,
      };
    } else if (tool === 'circle') {
      newElement = {
        type: 'circle',
        x: startPos.current.x, // Circle center X
        y: startPos.current.y, // Circle center Y
        radius: 0,
        fill: fillColor, // Apply fill color for shapes
        ...commonProps,
      };
    }

    if (newElement) {
      setElements((prevElements) => [...prevElements, newElement]); // Add the new element to state
      socket.emit('element-update', newElement); // Emit the initial element to server
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || !currentElementId.current) {
      return;
    }
    const currentPos = e.target.getStage().getPointerPosition();

    setElements((prevElements) => {
      // Find and update the element currently being drawn
      const updatedElements = prevElements.map((el) => {
        if (el.id === currentElementId.current) {
          const updatedEl = { ...el }; // Create a mutable copy for modification

          if (updatedEl.type === 'line') {
            updatedEl.points = updatedEl.points.concat([currentPos.x, currentPos.y]);
          } else if (updatedEl.type === 'rect') {
            // Konva Rect uses top-left x,y, and non-negative width/height
            // Adjust x and y to be the minimum of start and current position
            updatedEl.x = Math.min(startPos.current.x, currentPos.x);
            updatedEl.y = Math.min(startPos.current.y, currentPos.y);
            // Width and height are absolute differences
            updatedEl.width = Math.abs(currentPos.x - startPos.current.x);
            updatedEl.height = Math.abs(currentPos.y - startPos.current.y);
          } else if (updatedEl.type === 'circle') {
            // Circle radius is distance from start point to current point
            const dx = currentPos.x - startPos.current.x;
            const dy = currentPos.y - startPos.current.y;
            updatedEl.radius = Math.sqrt(dx * dx + dy * dy);
          }

          // Emit the updated element for real-time sync with other clients
          socket.emit('element-update', updatedEl);
          return updatedEl;
        }
        return el; // Return unchanged elements
      });
      return updatedElements;
    });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    currentElementId.current = null; // Clear the ID of the element being drawn
  };

  const clearCanvas = () => {
    setElements([]); // Clear all elements from state
    socket.emit('clear-canvas');
  };

  // Eraser color matches canvas background
  const eraserColor = '#f5f5f5';

  const handleUsernameChange = (e) => {
    const newName = e.target.value;
    setMyUsername(newName);
    socket.emit('update-username', newName);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>✨ Collaborative Canvas</h1>
      </header>

      <div className="toolbar">
        {/* User Info */}
        <div className="user-info">
          <label htmlFor="username-input">Your Name:</label>
          <input
            id="username-input"
            type="text"
            value={myUsername}
            onChange={handleUsernameChange}
            placeholder="Enter your name"
            maxLength="20"
            title="Your collaborative username"
          />
          {myPresenceColor && (
            <span className="user-presence-color" style={{ backgroundColor: myPresenceColor }} title="Your presence color"></span>
          )}
        </div>

        {/* Drawing Tools */}
        <button
          className={`tool-button ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => setTool('pen')}
          title="Pen Tool"
        >
          ✏️ Pen
        </button>
        <button
          className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser Tool"
        >
          🧼 Eraser
        </button>
        <button
          className={`tool-button ${tool === 'rect' ? 'active' : ''}`}
          onClick={() => setTool('rect')}
          title="Draw Rectangle"
        >
          ⬛ Rectangle
        </button>
        <button
          className={`tool-button ${tool === 'circle' ? 'active' : ''}`}
          onClick={() => setTool('circle')}
          title="Draw Circle"
        >
          ⚪ Circle
        </button>

        {/* Color Pickers (Stroke and Fill) */}
        <div className="color-picker-container">
          <label htmlFor="stroke-color-input" className="sr-only">Select Stroke Color</label>
          <input
            id="stroke-color-input"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={tool === 'eraser'}
            title="Select Stroke Color"
          />
          <label htmlFor="fill-color-input" className="sr-only">Select Fill Color</label>
          <input
            id="fill-color-input"
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            // Fill color only relevant for shapes (not pen/eraser)
            disabled={tool === 'pen' || tool === 'eraser'}
            title="Select Fill Color (Shapes Only)"
          />
        </div>

        {/* Stroke Width Slider */}
        <div className="stroke-width-container">
          <label htmlFor="stroke-width-range">Thickness:</label>
          <input
            id="stroke-width-range"
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            title="Adjust Line Thickness"
          />
          <span className="stroke-width-value">{strokeWidth}px</span>
        </div>

        <button className="clear-button" onClick={clearCanvas} title="Clear Canvas">
          🗑️ Clear All
        </button>
      </div>

      <main className="canvas-main-content">
        <div className="active-users-list">
          <h3>Active Collaborators ({Object.keys(activeUsers).length})</h3>
          <ul>
            {Object.values(activeUsers).map(user => (
              <li key={user.id} className={user.id === myUserId ? 'me' : ''}>
                <span className="user-presence-color" style={{ backgroundColor: user.color }}></span>
                {user.username} {user.id === myUserId && '(You)'}
              </li>
            ))}
          </ul>
        </div>

        <div className="canvas-container" ref={canvasContainerRef}>
          <Stage
            width={stageWidth}
            height={stageHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            ref={stageRef}
            className="konva-stage"
          >
            <Layer>
              {elements.map((element, i) => {
                // Determine stroke color for element based on tool type (eraser matches background)
                const strokeColor = element.tool === 'pen' || element.tool === 'rect' || element.tool === 'circle' ? element.stroke : eraserColor;

                if (element.type === 'line') {
                  return (
                    <Line
                      key={element.id || i} // Use unique ID as key if present
                      points={element.points}
                      stroke={strokeColor}
                      strokeWidth={element.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation={
                        element.tool === 'eraser' ? 'destination-out' : 'source-over'
                      }
                    />
                  );
                } else if (element.type === 'rect') {
                  return (
                    <Rect
                      key={element.id || i}
                      x={element.x}
                      y={element.y}
                      width={element.width}
                      height={element.height}
                      stroke={strokeColor}
                      strokeWidth={element.strokeWidth}
                      fill={element.fill}
                      globalCompositeOperation={
                        element.tool === 'eraser' ? 'destination-out' : 'source-over'
                      }
                    />
                  );
                } else if (element.type === 'circle') {
                  return (
                    <Circle
                      key={element.id || i}
                      x={element.x} // Center X
                      y={element.y} // Center Y
                      radius={element.radius}
                      stroke={strokeColor}
                      strokeWidth={element.strokeWidth}
                      fill={element.fill}
                      globalCompositeOperation={
                        element.tool === 'eraser' ? 'destination-out' : 'source-over'
                      }
                    />
                  );
                }
                return null; 
              })}
            </Layer>
          </Stage>
        </div>
      </main>
    </div>
  );
}

export default App;