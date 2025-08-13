const { Pool } = require("pg");
const path = require("path");
const dotenv = require("dotenv-safe");

dotenv.config({
	path: path.join(__dirname, "..", ".env"),
	sample: path.join(__dirname, "..", ".env.example"),
});

const connectionString = process.env.DB_CONNECTION_STRING;

const pool = new Pool({ connectionString });

module.exports = {
	query: (text, params, callback) => {
		return pool.query(text, params, callback);
	},
};
