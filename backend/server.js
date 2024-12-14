const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load environment variables
const cron = require('node-cron');
const path = require('path');


// Initialize the Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));


// MongoDB Connection
mongoose.connect('mongodb+srv://anshitasrivastava124:ashi12@expensetracker.weum9.mongodb.net/?retryWrites=true&w=majority&appName=ExpenseTracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Expense Schema & Model
const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now }, // Expense date
  isRecurring: { type: Boolean, default: false }, // Whether the expense is recurring
  recurrenceInterval: { type: Number }, // Recurrence interval in days
  lastRecurringDate: { type: Date }, 
});

const Expense = mongoose.model('Expense', expenseSchema);

// Budget Schema & Model
const budgetSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
});

const Budget = mongoose.model('Budget', budgetSchema);

// Routes

// Welcome Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Expense Tracker API!' });
});

// Add a new expense
app.post('/api/expenses', async (req, res) => {
    try {
      const { amount, description, category, isRecurring, recurrenceInterval } = req.body;
  
      if (!amount || !description || !category) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const newExpense = new Expense({
        amount,
        description,
        category,
        isRecurring,
        recurrenceInterval,
        lastRecurringDate: isRecurring ? new Date() : null,
      });
  
      const savedExpense = await newExpense.save();
      res.status(201).json(savedExpense);
    } catch (error) {
      console.error('Error adding expense:', error);
      res.status(500).json({ message: 'Error adding expense' });
    }
  });

// Get all expenses or filter by category
app.get('/api/expenses', async (req, res) => {
  const { description, category } = req.query;

  try {
    let expenses;
    let totalAmount = 0;

    if (description && category) {
        // If both description and category are provided, filter by both
        expenses = await Expense.find({
          description: { $regex: description, $options: 'i' },  // Case-insensitive match
          category: { $regex: category, $options: 'i' }
        });
      } else if (description) {
        // If only description is provided, filter by description
        expenses = await Expense.find({
          description: { $regex: description, $options: 'i' }  // Case-insensitive match
        });
      } else if (category) {
        // If only category is provided, filter by category
        expenses = await Expense.find({ category: { $regex: category, $options: 'i' } });
      } else {
        // If no filters are provided, return all expenses
        expenses = await Expense.find();
      }
  
    expenses.forEach((expense) => {
      totalAmount += expense.amount;
    });

    res.status(200).json({ expenses, totalAmount });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// Edit an expense
app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, description, category } = req.body;

  if (!amount || !description || !category) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      { amount, description, category },
      { new: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Error updating expense' });
  }
});

// Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await Expense.findByIdAndDelete(id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Error deleting expense' });
  }
});

// Cron Job for Recurring Expenses
cron.schedule('0 0 * * *', async () => { // Runs daily at midnight
    try {
      const today = new Date();
      const recurringExpenses = await Expense.find({ isRecurring: true });
  
      for (const expense of recurringExpenses) {
        const daysSinceLast = Math.floor(
          (today - new Date(expense.lastRecurringDate)) / (1000 * 60 * 60 * 24)
        );
  
        if (daysSinceLast >= expense.recurrenceInterval) {
          const newExpense = new Expense({
            amount: expense.amount,
            description: expense.description,
            category: expense.category,
            isRecurring: expense.isRecurring,
            recurrenceInterval: expense.recurrenceInterval,
            lastRecurringDate: new Date(),
          });
          await newExpense.save();
          await Expense.findByIdAndUpdate(expense._id, { lastRecurringDate: new Date() });
        }
      }
  
      console.log('Recurring expenses updated successfully!');
    } catch (error) {
      console.error('Error updating recurring expenses:', error);
    }
  });

// **Budget Management Routes**

app.get('/api/budget', async (req, res) => {
    try {
        const budget = await Budget.findOne();
        res.json(budget || { amount: 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch budget' });
    }
});

app.post('/api/budget', async (req, res) => {
    try {
        const { amount } = req.body;
        let budget = await Budget.findOne();
        if (budget) {
            budget.amount = amount;
        } else {
            budget = new Budget({ amount });
        }
        await budget.save();
        res.json(budget);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update budget' });
    }
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});


// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
