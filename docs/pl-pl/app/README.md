---
slug: pl-pl/app
title: "Aplikacja GitHub Copilot"
authors:
  - geektrainer
lastUpdated: 2026-06-30
---

[**Aplikacja GitHub Copilot**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) to aplikacja desktopowa oparta na Copilot CLI, która skupia rozwój sterowany agentami w jednym, skoncentrowanym obszarze roboczym. Dodaje równoległe sesje agentów, przełączalne tryby sesji, współdzielone kanwy oraz natywne zarządzanie zgłoszeniami (issues) i pull requestami GitHub — w tym **Agent Merge**, które przeprowadza pull request przez rebase, uwagi z przeglądu, poprawki CI i scalenie.

W tych lekcjach zainstalujesz aplikację i skonfigurujesz projekt, a następnie zapoznasz się z obszarem roboczym aplikacji oraz backlogiem, który szablon dla Ciebie przygotował. Zaczniesz od małej zmiany — dodania oceny gwiazdkowej — potem dodasz standard instrukcji niestandardowych ze zgłoszenia, zbudujesz funkcję filtrowania w izolowanej sesji agenta i zweryfikujesz ją za pomocą skillu wielokrotnego użytku. Dodasz serwer Playwright MCP, aby zbadać funkcję w prawdziwej przeglądarce, a następnie przejdziesz po drabinie automatyzacji scalania kończącej się tym, że **Agent Merge** scali Twój pull request. Na koniec będziesz współpracować na współdzielonej kanwie i zautomatyzujesz powtarzalną pracę — pełna pętla od pomysłu do scalonej funkcji.

## Lekcje

| Lekcja | Temat | Opis |
|--------|-------|------|
| [0. Wymagania wstępne][ex0] | Konfiguracja | Zainstaluj Node.js i utwórz swoją kopię projektu Tailspin Toys |
| [1. Instalacja aplikacji Copilot][ex1] | Konfiguracja | Zainstaluj aplikację, podłącz projekt i zapoznaj się z obszarem roboczym |
| [2. Uruchomienie pierwszej sesji agenta][ex2] | Pierwsza zmiana | Rozpocznij sesję i wypchnij małą zmianę jako pierwszy pull request |
| [3. Prowadzenie Copilota instrukcjami niestandardowymi][ex3] | Kontekst | Dodaj standard dokumentacji ze zgłoszenia i scal go |
| [4. Budowanie funkcji z Autopilot][ex4] | Główna funkcja | Użyj Plan i Autopilot do zbudowania filtrowania, potem zweryfikuj je skillem |
| [5. Testowanie z Playwright MCP][ex5] | Narzędzia zewnętrzne | Dodaj serwer Playwright MCP i zbadaj funkcję w przeglądarce |
| [6. Scalanie z Agent Merge][ex6] | Scalanie | Pozwól Agent Merge naprawić i scalić pull request filtrowania |
| [7. Planowanie z kanwami][ex7] | Współpraca | Utwórz współdzieloną kanwę do planowania i śledzenia pracy |
| [8. Podsumowanie i kolejne kroki][ex8] | Podsumowanie | Zautomatyzuj powtarzalne zadania i odkryj, co dalej |

## Wymagania wstępne

Przed udziałem w tych warsztatach upewnij się, że masz:

- [ ] Konto GitHub z aktywnym planem **Copilot Student, Pro, Pro+, Business lub Enterprise**
- [ ] Komputer z **macOS, Linux lub Windows**
- [ ] [Zainstalowany Git][install-git] na komputerze

> [!TIP]
> Brak płatnego planu? Zweryfikowani studenci mogą otrzymać GitHub Copilot za darmo przez [GitHub Education][callout-student-plan-education]. Plan **Copilot Student** obejmuje agenta, MCP, przegląd kodu i funkcje Copilot CLI używane w tych warsztatach — więc możesz ukończyć każde środowisko.

> [!NOTE]
> Ponieważ aplikacja Copilot działa na Twoim komputerze, a nie w codespace, [Lekcja 0][ex0] prowadzi Cię przez instalację Node.js i utworzenie kopii projektu przed instalacją aplikacji.

> [!NOTE]
> Jeśli korzystasz z Copilot Business lub Copilot Enterprise, administrator musi włączyć zasadę **Copilot CLI**, zanim będziesz mógł używać aplikacji.

## Rozpocznij

**[Zacznij od Lekcji 0: Wymagania wstępne →][ex0]**

[ex0]: 0-prerequisites/
[ex1]: 1-install-copilot-app/
[ex2]: 2-add-star-rating/
[ex3]: 3-custom-instructions/
[ex4]: 4-build-filtering/
[ex5]: 5-mcp-playwright/
[ex6]: 6-agent-merge/
[ex7]: 7-canvases/
[ex8]: 8-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students
