package model

import (
	"fmt"
	"io"
	"log"
	"os/exec"
	"strings"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type Item string

func (i Item) FilterValue() string { return "" }

var (
	titleStyle        = lipgloss.NewStyle().MarginLeft(2)
	itemStyle         = lipgloss.NewStyle().PaddingLeft(4)
	selectedItemStyle = lipgloss.NewStyle().PaddingLeft(2).Foreground(lipgloss.Color("170"))
	paginationStyle   = list.DefaultStyles().PaginationStyle.PaddingLeft(4)
	helpStyle         = list.DefaultStyles().HelpStyle.PaddingLeft(4).PaddingBottom(1)
	quitTextStyle     = lipgloss.NewStyle().Margin(1, 0, 2, 4)
)

type ItemDelegate struct{}

func (d ItemDelegate) Height() int                             { return 1 }
func (d ItemDelegate) Spacing() int                            { return 0 }
func (d ItemDelegate) Update(_ tea.Msg, _ *list.Model) tea.Cmd { return nil }
func (d ItemDelegate) Render(w io.Writer, m list.Model, index int, listItem list.Item) {
	i, ok := listItem.(Item)
	if !ok {
		return
	}

	str := fmt.Sprintf("%d. %s", index+1, i)

	fn := itemStyle.Render
	if index == m.Index() {
		fn = func(s ...string) string {
			return selectedItemStyle.Render("> " + strings.Join(s, " "))
		}
	}

	fmt.Fprint(w, fn(str))
}

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
