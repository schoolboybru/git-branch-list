package main

import (
	"fmt"
	"github.com/schoolboybru/git-branch-list/internal/model"
	"os"

	tea "github.com/charmbracelet/bubbletea"
)

func main() {
	p := tea.NewProgram(model.GetBranches())

	if _, err := p.Run(); err != nil {
		fmt.Printf("An error occured: %v", err)
		os.Exit(1)
	}
}
