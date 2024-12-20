import { useState } from 'react';

const Counter = () => {
  const [counter, setCounter] = useState<number>(0);

  return (
    <div>
      {counter}
      <button onClick={() => setCounter(counter + 1)}>Increment</button>
    </div>
  );
};

export default Counter;
