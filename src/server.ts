import app from "./app";
import dotenv from "dotenv";

dotenv.config();
app.listen(process.env.SERVER_PORT ?? "3333", () => {
  console.log(
    `running at https://127.0.0.1:${process.env.SERVER_PORT ?? "3333"}`
  );
});
