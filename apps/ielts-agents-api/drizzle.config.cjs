const path = require("node:path");

module.exports = {
	dbCredentials: {
		url:
			process.env.PG_URL ||
			"postgresql://postgres:postgres@localhost:5432/postgres",
	},
	schema: path.join(__dirname, "lib", "schema", "index.ts"),
	dialect: "postgresql",
};
