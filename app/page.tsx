import { Home } from "../components/home";
import { DailyEdition } from "../components/daily/daily-edition";
import { loadDailyEdition } from "../lib/daily/loader";

export default function Page() {
  return <Home dailyEdition={<DailyEdition edition={loadDailyEdition()} />} />;
}
