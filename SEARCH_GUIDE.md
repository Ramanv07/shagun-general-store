# Shagun Mart: Smart Search Guide (Hinglish)

Yeh guide batata hai ki Shagun Mart ka naya Search Engine kaise kaam karta hai aur admin isko kaise manage kar sakta hai.

---

## 1. Search Kaise Kaam Karta Hai?

Pehle search sirf exact name match karta tha (regex), jisse agar customer `"mamaearth face wash"` likhta tha toh kuch nahi milta tha kyunki beech ke words match nahi hote the.

Ab search engine smart hai aur ye sab automatically handle karta hai:
1. **Multi-Word Queries:** `"mamaearth face wash"` ya `"face wash mamaearth"` — words ka order aage-peeche hone par bhi exact items top par aate hain (Tokenized AND matching).
2. **Typo Tolerance (Galti Maaf):**
   - Agar customer `"mamarth"` likhe -> Mamaearth ke products dikhte hain.
   - Agar customer `"fae wash"` ya `"fase wash"` likhe -> Face wash products dikhte hain.
   - 1-3 letter words: 0 galti allow hoti hai (taaki galat products na aayein).
   - 4-6 letter words: 1 letter ki galti allow hoti hai (jaise `crem` -> `cream`).
   - 7+ letter words: 2 letter ki galti allow hoti hai.
3. **Compound Words (Jude hue ya alag words):**
   - Customer chahe `"facewash"` likhe ya `"face wash"`, dono cases mein face wash products hi aayenge.
   - Same for `"sunscreen"` / `"sun screen"`, `"bodywash"` / `"body wash"`, `"hairoil"` / `"hair oil"`.
4. **Numbers & Units:**
   - `"vaseline 400ml"`, `"vaseline 400 ml"`, ya `"vaseline 400"` — sabhi forms exact 400ml product ko match karte hain.
5. **Ranking Order (Kaunsa item upar aayega):**
   - In-stock items hamesha out-of-stock items se upar aate hain.
   - Draft products aur deleted products kabhi bhi public search mein nahi dikhte.

---

## 2. "Showing results for <word>" Banner Kyun Aata Hai?

Jab customer kisi product ki spelling galat likhta hai (jaise `"mamarth"` ya `"fae wash"`):
- Search engine automatic typo-correction karta hai aur top match ke hisaab se products dikhata hai.
- Customer ko transparent rakhne ke liye ek soft banner dikhta hai:
  *"Showing results for mamaearth — Search instead for mamarth"*
- Agar customer *"Search instead for..."* par tap kare, toh app strict original term se search karta hai.

---

## 3. Synonyms (Urf / Desi Naam) Kaise Kaam Karte Hain?

India mein log aksar desi naam ya common variations search karte hain, jaise:
- `"saabun"` ya `"sabun"` -> Soap
- `"shampu"` -> Shampoo
- `"tel"` -> Hair oil
- `"kajol"` / `"surma"` -> Kajal
- `"lotoin"` -> Lotion

### Synonyms Manage Karne Ka Tarika:
1. **Admin Panel** mein login karein (`/admin`).
2. **"Synonyms"** tab par click karein.
3. Yahan aap JSON format mein kisi bhi brand ya item ke naye synonyms add/edit kar sakte hain.
4. **"Save Synonyms"** button dabate hi naye synonyms turant live ho jaate hain (zero downtime).

### Starter Synonyms Seed Script:
Agar fresh database setup kiya hai, toh starter synonyms seed karne ke liye command run karein:
```powershell
node backend/scripts/seed_search_synonyms.js
```
*(Atlas safety guard laga hua hai; live Atlas ke liye `--confirm` zaroori hai).*

---

## 4. "Searches with No Results" (Zero Searches) Log Kya Hai?

Jab koi customer aisa kuch search karta hai jo store mein nahi milta (zero results), system us query ko bina kisi customer details ke `SearchMiss` collection mein record kar leta hai.

### Admin Dashboard mein kaise dekhein:
1. Admin Dashboard (`/admin`) kholein.
2. **"Zero Searches"** tab par click karein.
3. Yahan aapko dikhega:
   - Kaunse words customers ne search kiye jo nahi mile.
   - Kitni baar search kiya gaya (Frequency Count).
   - Aakhri baar kab search hua (Last Searched Date).
4. **Faayda:** Aap dekh sakte hain ki customer kaunse naye brands ya products maang rahe hain taaki aap unhe store ke stock mein add kar sakein!
5. Jab aap product stock mein add kar lein, aap us miss record ko **"Dismiss"** kar sakte hain.
