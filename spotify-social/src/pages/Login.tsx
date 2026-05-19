import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/home', { replace: true }); }, [navigate]);
  return null;
};
