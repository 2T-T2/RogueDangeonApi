import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { Rogue } from "./Rogue.ts";

const app = new Application();
const router = new Router();

app.addEventListener("listen", (e) => {
  console.log(`Listen ${e.secure ? "https://" : "http://"}${e.hostname ?? "localhost"}:${e.port}`);
});

app.addEventListener("error", (e) => {
  console.log(JSON.stringify(e));
});

router.get("/rouge_dangeon", (ctx) => {
  const w = Number(ctx.request.url.searchParams.get("w")) ? Number(ctx.request.url.searchParams.get("w")) : 70;
  const h = Number(ctx.request.url.searchParams.get("h")) ? Number(ctx.request.url.searchParams.get("h")) : 40;
  const n = Number(ctx.request.url.searchParams.get("n")) ? Number(ctx.request.url.searchParams.get("n")) : 10;
  const s = Number(ctx.request.url.searchParams.get("s")) ? Number(ctx.request.url.searchParams.get("s")) : null;
  ctx.response.body = JSON.stringify(new Rogue(w, h, n, s));
});

router.get("/rouge_sample", (ctx) => {
  const w = Number(ctx.request.url.searchParams.get("w")) ? Number(ctx.request.url.searchParams.get("w")) : 70;
  const h = Number(ctx.request.url.searchParams.get("h")) ? Number(ctx.request.url.searchParams.get("h")) : 40;
  const n = Number(ctx.request.url.searchParams.get("n")) ? Number(ctx.request.url.searchParams.get("n")) : 10;
  const s = Number(ctx.request.url.searchParams.get("s")) ? Number(ctx.request.url.searchParams.get("s")) : null;
  const arr: number[] = JSON.parse(JSON.stringify(new Rogue(w, h, n, s)))["mesh"];
  let a = "";
  for(let i = 0; i < arr.length; i++) {
    switch(arr[i]) {
      case Rogue.BLANK: a += " "; break;
      case Rogue.COVE : a += "#"; break;
      case Rogue.DOOR : a += "+"; break;
      case Rogue.FLOOR: a += "."; break;
      case Rogue.HWALL: a += "-"; break;
      case Rogue.VWALL: a += "|"; break;
    }
    if(i % w == 0) a += "\n";
  }
  ctx.response.body = a;
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({port: 12345});
