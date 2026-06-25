package analyzer

import (
	"fmt"
	"math"

	"pmcs-ast/internal/parser"
)

// ?? ConflictResult represents the output of an AST comparison ?????????????????
type ConflictResult struct {
    BaseCommit      string
    TargetCommit    string
    ProbabilityScore float64
    ConflictingNodes []NodeConflict
    CriticalFiles   []string
}

// ?? NodeConflict represents a single detected AST-level conflict ??????????????
type NodeConflict struct {
    FilePath  string
    NodeType  string
    BaseLine  uint32
    TargetLine uint32
    Severity  string
}

// ?? CompareASTs compares two parsed files and returns a conflict result ????????
func CompareASTs(
    baseCommit string,
    targetCommit string,
    baseFiles []*parser.ParsedFile,
    targetFiles []*parser.ParsedFile,
) (*ConflictResult, error) {
    if len(baseFiles) == 0 || len(targetFiles) == 0 {
        return nil, fmt.Errorf("both base and target must have at least one parsed file")
    }

    // ?? Build lookup map of base nodes by file path ???????????????????????????
    baseNodeMap := make(map[string]map[string]parser.ASTNode)
    for _, f := range baseFiles {
        nodesBySignature := make(map[string]parser.ASTNode)
        for _, n := range f.Nodes {
            nodesBySignature[n.Signature] = n
        }
        baseNodeMap[f.FilePath] = nodesBySignature
    }

    var conflicts []NodeConflict
    criticalFileSet := make(map[string]bool)

    // ?? Compare target nodes against base nodes ???????????????????????????????
    for _, targetFile := range targetFiles {
        baseNodes, fileExists := baseNodeMap[targetFile.FilePath]

        if !fileExists {
            // New file introduced � low risk
            continue
        }

        for _, targetNode := range targetFile.Nodes {
            if _, unchanged := baseNodes[targetNode.Signature]; !unchanged {
                // Node signature changed � potential conflict
                conflicts = append(conflicts, NodeConflict{
                    FilePath:   targetFile.FilePath,
                    NodeType:   targetNode.Type,
                    BaseLine:   0,
                    TargetLine: targetNode.StartLine,
                    Severity:   classifySeverity(targetNode.Type),
                })
                criticalFileSet[targetFile.FilePath] = true
            }
        }
    }

    // ?? Compute probability score ?????????????????????????????????????????????
    score := computeProbabilityScore(conflicts, baseFiles, targetFiles)

    // ?? Build critical files list ?????????????????????????????????????????????
    var criticalFiles []string
    for f := range criticalFileSet {
        criticalFiles = append(criticalFiles, f)
    }

    return &ConflictResult{
        BaseCommit:       baseCommit,
        TargetCommit:     targetCommit,
        ProbabilityScore: score,
        ConflictingNodes: conflicts,
        CriticalFiles:    criticalFiles,
    }, nil
}

// ?? classifySeverity assigns severity based on node type ??????????????????????
func classifySeverity(nodeType string) string {
    switch nodeType {
    case "function_declaration", "method_declaration":
        return "HIGH"
    case "type_declaration", "import_declaration":
        return "MEDIUM"
    default:
        return "LOW"
    }
}

// ?? computeProbabilityScore calculates a 0.00-1.00 risk score ?????????????????
func computeProbabilityScore(
    conflicts []NodeConflict,
    baseFiles []*parser.ParsedFile,
    targetFiles []*parser.ParsedFile,
) float64 {
    if len(conflicts) == 0 {
        return 0.0
    }

    totalNodes := 0
    for _, f := range targetFiles {
        totalNodes += len(f.Nodes)
    }

    if totalNodes == 0 {
        return 0.0
    }

    rawScore := float64(len(conflicts)) / float64(totalNodes)

    // Apply severity weighting
    severityWeight := 0.0
    for _, c := range conflicts {
        switch c.Severity {
        case "HIGH":
            severityWeight += 0.3
        case "MEDIUM":
            severityWeight += 0.15
        default:
            severityWeight += 0.05
        }
    }

    weighted := rawScore + (severityWeight / float64(len(conflicts)))
    return math.Min(weighted, 1.0)
}
