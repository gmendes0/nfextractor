import { NextFunction, Request, Response } from "express";
import puppeteer from "puppeteer";

export default {
  async get(request: Request, response: Response, next: NextFunction) {
    const { url } = request.body;

    try {
      await (async () => {
        const browser = await puppeteer.launch();

        try {
          const page = await browser.newPage();
          await page.goto(url);

          const items = await page.evaluate(() => {
            const rows = document.querySelectorAll<HTMLTableRowElement>(
              "#conteudo table tbody tr"
            );

            const items = Array.from(rows).map(row => {
              const codeElement = row.cells[0].querySelector<HTMLSpanElement>(
                ".RCod"
              );
              const nameElement = row.cells[0].querySelector<HTMLSpanElement>(
                ".txtTit2"
              );
              const quantityElement = row.cells[0].querySelector<HTMLSpanElement>(
                ".Rqtd"
              );
              const unitElement = row.cells[0].querySelector<HTMLSpanElement>(
                ".RUN"
              );
              const unitaryValueElement = row.cells[0].querySelector<HTMLSpanElement>(
                ".RvlUnit"
              );
              const totalElement = row.cells[1];

              const sanitizedQuantity = quantityElement?.innerText.match(
                /(\d|,)*$/g
              );

              return {
                code: codeElement?.innerText.replace(/\D/g, ""),
                name: nameElement?.innerHTML,
                quantity: Array.isArray(sanitizedQuantity)
                  ? sanitizedQuantity[0].replace(",", ".")
                  : 0,
                unit: unitElement?.innerText.replace(/^UN:/g, "").trim(),
                unitary_value: unitaryValueElement?.innerText
                  .replace(/^Vl\. Unit\.:/g, "")
                  .trim()
                  .replace(",", "."),
                total_value: totalElement.innerText
                  .replace(/^Vl. Total/gm, "")
                  .trim()
                  .replace(",", "."),
              };
            });

            return items;
          });

          response.json({ ok: true, data: items });
        } catch (error) {
          console.error(error);
          throw new Error("whoops! something went wrong.");
        } finally {
          await browser.close();
        }
      })();
    } catch (error) {
      console.error(error);
      return response.json({ ok: false, error });
    }
  },
};
