package parser

import (
    "context"
    "crypto/sha256"
    "fmt"
    "os"

    sitter "github.com/smacker/go-tree-sitter"
    "github.com/smacker/go-tree-sitter/golang"
)

// ?? ParsedFile represents the AST result for a single file ???????????????????
type ParsedFile struct {
    FilePath   string
    ASTHash    string
    Nodes      []ASTNode
    RawContent []byte
}

// ?? ASTNode represents a single meaningful node in the syntax tree ????????????
type ASTNode struct {
    Type      string
    Content   string
    StartLine uint32
    EndLine   uint32
    Signature string
}

// ?? ParseFile parses a single Go source file into a ParsedFile ????????????????
func ParseFile(ctx context.Context, filePath string) (*ParsedFile, error) {
    content, err := os.ReadFile(filePath)
    if err != nil {
        return nil, fmt.Errorf("failed to read file %s: %w", filePath, err)
    }

    parser := sitter.NewParser()
    parser.SetLanguage(golang.GetLanguage())

    tree, err := parser.ParseCtx(ctx, nil, content)
    if err != nil {
        return nil, fmt.Errorf("failed to parse file %s: %w", filePath, err)
    }
    defer tree.Close()

    root := tree.RootNode()
    nodes := extractNodes(root, content)
    hash := computeHash(content)

    return &ParsedFile{
        FilePath:   filePath,
        ASTHash:    hash,
        Nodes:      nodes,
        RawContent: content,
    }, nil
}

// ?? extractNodes walks the AST and extracts meaningful node signatures ?????????
func extractNodes(node *sitter.Node, content []byte) []ASTNode {
    var nodes []ASTNode

    interestingTypes := map[string]bool{
        "function_declaration":  true,
        "method_declaration":    true,
        "type_declaration":      true,
        "import_declaration":    true,
        "const_declaration":     true,
        "var_declaration":       true,
    }

    if interestingTypes[node.Type()] {
        nodeContent := content[node.StartByte():node.EndByte()]
        nodes = append(nodes, ASTNode{
            Type:      node.Type(),
            Content:   string(nodeContent),
            StartLine: node.StartPoint().Row + 1,
            EndLine:   node.EndPoint().Row + 1,
            Signature: computeHash(nodeContent),
        })
    }

    for i := 0; i < int(node.ChildCount()); i++ {
        child := node.Child(i)
        nodes = append(nodes, extractNodes(child, content)...)
    }

    return nodes
}

// ?? computeHash generates a SHA-256 hash of content for quick diffing ?????????
func computeHash(content []byte) string {
    return fmt.Sprintf("%x", sha256.Sum256(content))
}
