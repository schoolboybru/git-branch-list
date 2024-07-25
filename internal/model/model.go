package model

import (
	"fmt"
	"log"
	"os/exec"
	"strings"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
)

type Model struct {
	List     list.Model
	choice   string
	quitting bool
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			m.quitting = true
			return m, tea.Quit
		case "enter", " ":
			i, ok := m.List.SelectedItem().(Item)
			if ok {
				m.choice = string(i)
			}
			return m, tea.Quit
		case "d":
			i, ok := m.List.SelectedItem().(Item)
			if ok {
				deleteBranch(string(i))
			}
			return m, tea.Quit
		}
	}
	var cmd tea.Cmd
	m.List, cmd = m.List.Update(msg)
	return m, cmd
}

func (m Model) View() string {
	if m.choice != "" {
		out, _ := selectBranch(m.choice)

		return quitTextStyle.Render(fmt.Sprintf("%s", out))
	}

	return m.List.View()
}

func selectBranch(branch string) ([]byte, error) {
	out, err := exec.Command("git", "checkout", branch).CombinedOutput()

	return out, err
}

func deleteBranch(branch string) ([]byte, error) {
	out, err := exec.Command("git", "branch", "-D", branch).CombinedOutput()

	return out, err
}

func GetBranches() Model {
	out, err := exec.Command("git", "branch", "-l").Output()

	if err != nil {
		log.Fatal(err)
	}

	result := string(out[:])

	result = strings.Replace(result, "*", " ", -1)

	result = strings.Replace(result, "\n", ",", -1)

	result = strings.TrimSuffix(result, ",")

	choices := strings.Split(result, ",")

	for i := range choices {
		choices[i] = strings.TrimSpace(choices[i])
	}

	items := []list.Item{}

	for _, i := range choices {
		items = append(items, Item(i))
	}

	l := list.New(items, ItemDelegate{}, 20, 12)
	l.Title = "Select a branch"
	l.SetShowStatusBar(false)
	l.SetFilteringEnabled(false)
	l.Styles.Title = titleStyle
	l.Styles.PaginationStyle = paginationStyle
	l.Styles.HelpStyle = helpStyle

	return Model{
		List: l,
	}
}
