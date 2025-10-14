import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './lib/supabase';

// Load environment variables first
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to GoBusker API' });
});

// Test Supabase connection
app.get('/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    res.json({ 
      success: true, 
      message: 'Supabase connection successful',
      data: data || 'No session (expected for initial test)'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to connect to Supabase',
      error: error.message 
    });
  }
});

app.listen(port);