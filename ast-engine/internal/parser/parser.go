package parser

import (
    "context"
    "crypto/sha256"
    "fmt"
    "os"
    "path/filepath"
    "strings"

    sitter "github.com/smacker/go-tree-sitter"
    "github.com/smacker/go-tree-sitter/golang"
    "github.com/smacker/go-tree-sitter/javascript"
    "github.com/smacker/go-tree-sitter/typescript/typescript"
)

// ── ParsedFile represents the AST result for a single file ───────────────────
type ParsedFile struct {
    FilePath   string
    ASTHash    string
    Language   string
    Nodes      []ASTNode
    RawContent []byte
}

// ── ASTNode represents a single meaningful node in the syntax tree ────────────
type ASTNode struct {
    Type      string
    Content   string
    StartLine uint32
    EndLine   uint32
    Signature string
}

// ── detectLanguage returns the tree-sitter language for a file ────────────────
func detectLanguage(filePath string) (*sitter.Language, string, error) {
    ext := strings.ToLower(filepath.Ext(filePath))
    switch ext {
    case ".go":
        return golang.GetLanguage(), "go", nil
    case ".js", ".jsx", ".mjs", ".cjs":
        return javascript.GetLanguage(), "javascript", nil
    case ".ts", ".tsx":
        return typescript.GetLanguage(), "typescript", nil
    default:
        return nil, "", fmt.Errorf("unsupported file extension: %s", ext)
    }
}

// ── interestingNodeTypes returns meaningful node types per language ────────────
func interestingNodeTypes(language string) map[string]bool {
    switch language {
    case "go":
        return map[string]bool{
            "function_declaration": true,
            "method_declaration":   true,
            "type_declaration":     true,
            "import_declaration":   true,
            "const_declaration":    true,
            "var_declaration":      true,
        }
    case "javascript", "typescript":
        return map[string]bool{
            "function_declaration":       true,
            "arrow_function":             true,
            "class_declaration":          true,
            "method_definition":          true,
            "export_statement":           true,
            "import_statement":           true,
            "lexical_declaration":        true,
            "interface_declaration":      true,
            "type_alias_declaration":     true,
        }
    default:
        return map[string]bool{}
    }
}

// ── ParseFile parses a single source file into a ParsedFile ──────────────────
func ParseFile(ctx context.Context, filePath string) (*ParsedFile, error) {
    content, err := os.ReadFile(filePath)
    if err != nil {
        return nil, fmt.Errorf("failed to read file %s: %w", filePath, err)
    }

    lang, langName, err := detectLanguage(filePath)
    if err != nil {
        return nil, err
    }

    parser := sitter.NewParser()
    parser.SetLanguage(lang)

    tree, err := parser.ParseCtx(ctx, nil, content)
    if err != nil {
        return nil, fmt.Errorf("failed to parse file %s: %w", filePath, err)
    }
    defer tree.Close()

    root  := tree.RootNode()
    nodes := extractNodes(root, content, interestingNodeTypes(langName))
    hash  := computeHash(content)

    return &ParsedFile{
        FilePath:   filePath,
        ASTHash:    hash,
        Language:   langName,
        Nodes:      nodes,
        RawContent: content,
    }, nil
}

// ── ParseContent parses source content directly (no file needed) ──────────────
func ParseContent(ctx context.Context, content []byte, language string) (*ParsedFile, error) {
    var lang *sitter.Language
    switch language {
    case "go":
        lang = golang.GetLanguage()
    case "javascript":
        lang = javascript.GetLanguage()
    case "typescript":
        lang = typescript.GetLanguage()
    default:
        return nil, fmt.Errorf("unsupported language: %s", language)
    }

    parser := sitter.NewParser()
    parser.SetLanguage(lang)

    tree, err := parser.ParseCtx(ctx, nil, content)
    if err != nil {
        return nil, fmt.Errorf("failed to parse content: %w", err)
    }
    defer tree.Close()

    root  := tree.RootNode()
    nodes := extractNodes(root, content, interestingNodeTypes(language))
    hash  := computeHash(content)

    return &ParsedFile{
        FilePath:   "",
        ASTHash:    hash,
        Language:   language,
        Nodes:      nodes,
        RawContent: content,
    }, nil
}

// ── extractNodes walks the AST and extracts meaningful node signatures ─────────
func extractNodes(node *sitter.Node, content []byte, interesting map[string]bool) []ASTNode {
    var nodes []ASTNode

    if interesting[node.Type()] {
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
        nodes = append(nodes, extractNodes(child, content, interesting)...)
    }

    return nodes
}

// ── computeHash generates a SHA-256 hash for quick diffing ───────────────────
func computeHash(content []byte) string {
    return fmt.Sprintf("%x", sha256.Sum256(content))
}
