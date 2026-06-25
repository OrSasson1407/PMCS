package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "time"

    "pmcs-ast/internal/analyzer"
    "pmcs-ast/internal/parser"
)

const defaultPort = "50051"

type HealthResponse struct {
    Status    string `json:"status"`
    Service   string `json:"service"`
    Timestamp string `json:"timestamp"`
}

type AnalyzeRequest struct {
    BaseCommit   string   `json:"base_commit"`
    TargetCommit string   `json:"target_commit"`
    BaseFiles    []string `json:"base_files"`
    TargetFiles  []string `json:"target_files"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(HealthResponse{
        Status:    "ok",
        Service:   "pmcs-ast-engine",
        Timestamp: time.Now().UTC().Format(time.RFC3339),
    })
}

func analyzeHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req AnalyzeRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request body", http.StatusBadRequest)
        return
    }

    ctx := context.Background()

    var baseFiles []*parser.ParsedFile
    for _, path := range req.BaseFiles {
        parsed, err := parser.ParseFile(ctx, path)
        if err != nil {
            log.Printf("[ast-engine] Failed to parse base file %s: %v", path, err)
            continue
        }
        baseFiles = append(baseFiles, parsed)
    }

    var targetFiles []*parser.ParsedFile
    for _, path := range req.TargetFiles {
        parsed, err := parser.ParseFile(ctx, path)
        if err != nil {
            log.Printf("[ast-engine] Failed to parse target file %s: %v", path, err)
            continue
        }
        targetFiles = append(targetFiles, parsed)
    }

    result, err := analyzer.CompareASTs(req.BaseCommit, req.TargetCommit, baseFiles, targetFiles)
    if err != nil {
        http.Error(w, fmt.Sprintf("analysis failed: %v", err), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = defaultPort
    }

    mux := http.NewServeMux()
    mux.HandleFunc("/health", healthHandler)
    mux.HandleFunc("/analyze", analyzeHandler)

    addr := fmt.Sprintf(":%s", port)
    log.Printf("[ast-engine] Running on http://localhost%s", addr)

    if err := http.ListenAndServe(addr, mux); err != nil {
        log.Fatalf("[ast-engine] Failed to start server: %v", err)
    }
}
