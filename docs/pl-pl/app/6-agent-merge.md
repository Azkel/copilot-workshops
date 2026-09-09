---
title: "Lekcja 6 - Scalanie z Agent Merge"
description: "Otwórz pull request filtrowania, przejrzyj go w My work i pozwól Agent Merge naprawić to, co blokuje, oraz scalić za Ciebie — najwyższy szczebel drabiny automatyzacji scalania."
authors:
  - geektrainer
lastUpdated: 2026-07-09
---

Funkcja filtrowania jest zbudowana, zweryfikowana i widziana w działaniu w przeglądarce. Ostatni krok to jej scalenie. W tych warsztatach scaliłeś już dwukrotnie — za każdym razem otwierałeś pull request i sam go scalałeś na github.com. Tym razem pozwolisz aplikacji wziąć na siebie ciężką pracę dzięki **Agent Merge**, które przeprowadza pull request przez cały cykl życia z wnętrza aplikacji.

Podczas tej lekcji:

- poznasz, czym jest Agent Merge i jak automatyzuje cykl życia scalania.
- włączysz Agent Merge w sesji filtrowania.
- zobaczysz, jak tworzy pull request, uruchamia CI i scala, gdy wszystko jest zielone.

## Scenariusz

W ostatnich modułach zbadałeś różne poziomy automatyzacji — od tworzenia kodu po pozwolenie Copilotowi na bezpośrednią walidację UI. Aby jeszcze przyspieszyć rozwój, Tailspin Toys chce sprawdzić, czy pull requesty, które zostały przejrzane i zweryfikowane, mogą być automatycznie scalane.

## Przedstawiamy Agent Merge

**Agent Merge** automatyzuje ostatnią milę lądowania pull requesta przez aplikację Copilot. Gdy je włączysz, sesja aplikacji czyta Twój pull request, zajmuje się tym, co go blokuje — naprawiając nieudane sprawdzenia CI, odpowiadając na komentarze z przeglądu, robiąc rebase w razie potrzeby — i scala go, gdy tylko GitHub na to pozwoli. Działa w tle, przetrwa restarty aplikacji i wyłącza się samo, gdy pull request zostanie scalony.

Dotąd to Ty klikałeś **Merge pull request** na github.com. Agent Merge przenosi tę odpowiedzialność na agenta, żebyś mógł przejść do kolejnego zadania, podczas gdy ono przeprowadza PR do końca. Nadal przeglądasz i zatwierdzasz pracę — agent zajmuje się tylko mechaniczną metą.

## Użyj Agent Merge do zarządzania PR

Przejrzałeś kod ręcznie, uruchomiłeś testy i nawet pozwoliłeś Copilotowi zwalidować UI. Czas scalić nowy kod z bazą! Pozwólmy agent merge przeprowadzić PR przez ciągłą integrację (CI) i scalić.

1. Wróć do sesji otwartej w poprzednim module, w której dodawałeś funkcjonalność filtrowania.
2. W prawym górnym rogu wybierz listę rozwijaną obok **Create PR**.
3. Wybierz **Agent merge**, aby włączyć agent merge.

   ![Lista rozwijana Create PR w aplikacji GitHub Copilot rozwinięta, ze strzałką wskazującą opcję Agent merge](../../_images/app-enable-agent-merge.png)

4. Tekst przycisku zmienia się teraz na **Agent merge**.
5. Wybierz przycisk **Agent merge**, aby uruchomić proces agent merge.

Aplikacja Copilot rozpoczyna proces tworzenia i zarządzania PR! Zaczyna od zbadania projektu, by ustalić, jak najlepiej utworzyć PR, a potem tworzy nowy PR.

Po chwili zauważysz, że Copilot znów zaczyna pracę, patrząc na warunki PR — proces CI uruchamiający wszystkie testy w repozytorium. Zgłosi status wszelkich przeglądów pozostawionych przez innych członków zespołu, sprawdzeń do uruchomienia (proces CI) oraz tego, czy PR jest możliwy do scalenia.

6. Pozwól agent merge scalić pull request, wybierając listę rozwijaną obok **Agent merge**, a następnie **Merge pull request**.

   ![Lista rozwijana Agent merge pokazująca dozwolone działania agenta — Address reviews, Fix CI failures, Resolve conflicts — ze strzałką wskazującą Merge pull request](../../_images/app-agent-merge-merge.png)

7. Gdy wszystkie procesy CI będą zielone (czyli testy przeszły), Copilot scali pull request!

## Podsumowanie i kolejne kroki

Zautomatyzowałeś kilka części procesu deweloperskiego, w tym generowanie kodu, testowanie i walidację oraz teraz proces pull request. Ty:

- poznałeś, czym jest Agent Merge i jak automatyzuje cykl życia scalania.
- włączyłeś Agent Merge w sesji filtrowania.
- zobaczyłeś, jak tworzy pull request, uruchamia CI i scala, gdy wszystko było zielone.

W następnym kroku zbadasz **kanwy** — bogatszy sposób planowania i wizualizacji pracy z agentem. Przejdź do [Lekcji 7 - Planowanie z kanwami][next-lesson].

## Zasoby

- [Zarządzanie zgłoszeniami i pull requestami w aplikacji GitHub Copilot][managing-issues-prs]
- [O aplikacji GitHub Copilot][about-copilot-app]

[next-lesson]: ../7-canvases/
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
