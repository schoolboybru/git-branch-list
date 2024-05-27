package main

import (
	"fmt"
	"os"

	"github.com/schoolboybru/git-branch-list/internal/model"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "git-branch-list",
	Short: "Search and select a branch",
	Long:  "Git branch list is a way to quickly view and select a branch in the current repository.",
	Run: func(cmd *cobra.Command, args []string) {

		p := tea.NewProgram(model.GetBranches())
		p.Run()
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println("TEST")
		os.Exit(1)
	}
}

func main() {
	Execute()
}
