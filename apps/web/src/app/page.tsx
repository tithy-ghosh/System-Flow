import { hello, VERSION } from "@repo/sim-core";

export default function Home() {
  return (
    <div>
      <p>Engine version: {VERSION}</p>
      <p>{hello()}</p>
    </div>
  );
}
