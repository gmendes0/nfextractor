import { NextFunction, Request, Response } from "express";
import puppeteer from "puppeteer";
import { GoogleSpreadsheet } from "google-spreadsheet";

export interface IItem {
  code: string;
  name: string;
  quantity: string;
  unit: string;
  unitary_value: string;
  total_value: string;
  category: string;
}

export default {
  async get(request: Request, response: Response, next: NextFunction) {
    const { url } = request.body;

    try {
      await (async () => {
        const browser = await puppeteer.launch();

        try {
          const page = await browser.newPage();
          await page.goto(url);

          const nfe = await page.evaluate(() => {
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

              const item: IItem = {
                code: codeElement?.innerText.replace(/\D/g, "") ?? "",
                name: nameElement?.innerHTML ?? "",
                quantity: new Intl.NumberFormat("pt-BR").format(
                  Array.isArray(sanitizedQuantity)
                    ? Number(
                        sanitizedQuantity[0].replace(".", "").replace(",", ".")
                      )
                    : 0
                ),
                unit: unitElement?.innerText.replace(/^UN:/g, "").trim() ?? "",
                unitary_value: new Intl.NumberFormat("pt-BR").format(
                  Number(
                    unitaryValueElement?.innerText
                      .replace(/^Vl\. Unit\.:/g, "")
                      .trim()
                      .replace(".", "")
                      .replace(",", ".")
                  ) ?? "0"
                ),
                total_value: new Intl.NumberFormat("pt-BR").format(
                  Number(
                    totalElement.innerText
                      .replace(/^Vl. Total/gm, "")
                      .trim()
                      .replace(".", "")
                      .replace(",", ".")
                  ) ?? "0"
                ),
                category: "others",
              };

              return item;
            });

            const info_area = document?.querySelector<HTMLDivElement>("#infos");
            const key_area = document?.querySelector<HTMLSpanElement>(".key");

            if (!info_area)
              return { date: "", items: items, key: key_area?.innerText ?? "" };

            const date = info_area.innerText.match(
              /((?:[\d]{2}\/){2}[\d]{4}\ (?:[\d]{2}:){2}[\d]{2})(?=\ -\ Via\ Consumidor)/gi
            );

            if (date)
              return {
                date: date[0],
                items: items,
                key: key_area?.innerText ?? "",
              };

            return { date: "", items: items, key: key_area?.innerText ?? "" };
          });

          if (!process.env.GOOGLE_DOCUMENT_ID)
            throw new Error("Undefined Document ID");

          const doc = new GoogleSpreadsheet(process.env.GOOGLE_DOCUMENT_ID);

          if (
            !process.env.GOOGLE_CLIENT_EMAIL ||
            !process.env.GOOGLE_PRIVATE_KEY
          )
            throw new Error("Undefined Credentials");

          await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY,
          });

          await doc.loadInfo();

          const timestamp = nfe.date
            ? Date.parse(nfe.date.trim())
            : new Date().getTime();

          const date = new Date(timestamp);

          const title = `${date
            .toLocaleString("en", {
              month: "long",
            })
            .toLocaleLowerCase()} ${date.getFullYear()}`;

          const sheets = await doc.sheetsByTitle;

          const sheet = sheets[title]
            ? sheets[title]
            : await doc.addSheet({
                title,
              });

          if (!sheets[title])
            await sheet.setHeaderRow([
              "Item",
              "Qtd.",
              "Valor unt.",
              "Categoria",
              "Total",
            ]);

          console.log(sheet);

          const infos = nfe.items.map(item => ({
            Item: item.name,
            "Qtd.": item.quantity,
            "Valor unt.": item.unitary_value,
            Categoria: "",
            Total: item.total_value,
          }));

          infos.push({
            Item: `^^^ ${nfe.date} ^^^`,
            "Qtd.": "0",
            "Valor unt.": "0",
            Categoria: "",
            Total: "0",
          });

          await sheet.addRows(infos);

          response.json({ ok: true, data: nfe.items });
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
