import React, { useState } from 'react';

export const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  const handleIncrement = () => setCount((prev) => prev + 1);
  const handleDecrement = () => setCount((prev) => prev - 1);

  return (
    <div className="counter-widget">
      <h3>Current Count: {count}</h3>
      <button onClick={handleDecrement}>- Decrease</button>
      <button onClick={handleIncrement}>+ Increase</button>
    </div>
  );
};