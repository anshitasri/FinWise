const mongoose = require("mongoose");

const expenseSchema = mongoose.Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Expense = mongoose.model("Expense", expenseSchema);
// DELETE request to delete an expense
app.delete('/:id', async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) {
            return res.status(404).send('Expense not found');
        }
        res.status(200).send('Expense deleted');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = Expense;

