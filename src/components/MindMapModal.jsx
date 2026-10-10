import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Search, 
  Maximize2, 
  Minimize2, 
  Layers, 
  BookOpen, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Minus, 
  Brain, 
  Copy, 
  CheckCircle2, 
  Flame, 
  AlertTriangle,
  Move
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Interactive Mind Map Studio Component with Neo-Brutalist Pastel Visuals
 * Supports:
 * - Bi-directional Buzan-style Mind Map & Horizontal Tree layouts
 * - Smooth Infinite Pan & Zoom with trackpad / mouse-wheel support
 * - Expand / Collapse of individual branches and global toggles
 * - Deep node inspector drawer for in-depth conceptual breakdown
 * - Instant search & path highlighting
 * - High-res SVG/PNG export for offline revision
 * - AI re-synthesis on demand
 */
const MindMapModal = ({ isOpen, onClose, lectureData, mindMapData, loading, onRegenerate }) => {
  if (!isOpen) return null;

  // Layout mode: 'bidirectional' | 'horizontal' | 'vertical'
  const [layoutMode, setLayoutMode] = useState('bidirectional');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Collapsed node IDs set
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  // Selected node for inspector drawer
  const [selectedNode, setSelectedNode] = useState(null);
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Copied state
  const [isCopied, setIsCopied] = useState(false);

  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const rootData = useMemo(() => {
    return mindMapData?.root || null;
  }, [mindMapData]);

  // Center the mind map on open or root data change
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
      setZoom(1);
    }
  }, [isOpen, layoutMode]);

  // Handle pan drag
  const handleMouseDown = (e) => {
    // Only drag when clicking canvas background or svg, not node cards
    if (e.target.closest('.mindmap-interactive-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.35), 2.5));
  };

  const resetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
      setZoom(1);
    }
  };

  // Toggle collapse node
  const toggleCollapse = (nodeId, e) => {
    if (e) e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    setCollapsedIds(new Set());
    toast.success("Expanded all concept branches!");
  };

  const handleCollapseAll = () => {
    if (!rootData || !Array.isArray(rootData.children)) return;
    const allChildIds = new Set();
    const collect = (node) => {
      if (node.id !== 'root') allChildIds.add(node.id);
      if (Array.isArray(node.children)) node.children.forEach(collect);
    };
    rootData.children.forEach(collect);
    setCollapsedIds(allChildIds);
    toast.success("Collapsed to primary branches");
  };

  // Copy node content
  const handleCopyNode = (node) => {
    const text = `${node.title}\n\n${node.description || ''}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Concept copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Search matching
  const isSearchMatch = (node) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      node.title?.toLowerCase().includes(q) ||
      node.description?.toLowerCase().includes(q) ||
      node.badge?.toLowerCase().includes(q)
    );
  };

  // =========================================================================
  // MIND MAP LAYOUT ENGINE
  // Computes exact (x, y) coordinates for nodes and links
  // =========================================================================
  const { renderedNodes, renderedLinks } = useMemo(() => {
    if (!rootData) return { renderedNodes: [], renderedLinks: [] };

    const nodes = [];
    const links = [];

    // Node dimensions estimates for spacing
    const ROOT_WIDTH = 240;
    const ROOT_HEIGHT = 85;
    const L1_WIDTH = 220;
    const L1_HEIGHT = 80;
    const L2_WIDTH = 190;
    const L2_HEIGHT = 70;

    if (layoutMode === 'bidirectional') {
      // Bi-directional layout:
      // Half of Level-1 branches go to the RIGHT, half go to the LEFT
      const rightBranches = [];
      const leftBranches = [];

      (rootData.children || []).forEach((child, idx) => {
        if (idx % 2 === 0) {
          rightBranches.push(child);
        } else {
          leftBranches.push(child);
        }
      });

      // Add Root Node at (0, 0)
      nodes.push({
        ...rootData,
        x: 0,
        y: 0,
        width: ROOT_WIDTH,
        height: ROOT_HEIGHT,
        side: 'center'
      });

      // Helper to layout a side wing (direction: 1 for right, -1 for left)
      const layoutSideWing = (branches, direction) => {
        const side = direction === 1 ? 'right' : 'left';
        const startX = direction * (ROOT_WIDTH / 2 + 100);

        // Calculate total vertical height needed for this side
        let currentY = 0;
        const branchHeights = branches.map((branch) => {
          if (collapsedIds.has(branch.id)) return 110;
          const leafCount = Array.isArray(branch.children) ? branch.children.length : 0;
          return Math.max(110, leafCount * 85);
        });

        const totalSideHeight = branchHeights.reduce((acc, h) => acc + h, 0);
        let startSideY = -totalSideHeight / 2 + 50;

        branches.forEach((bNode, bIdx) => {
          const bH = branchHeights[bIdx];
          const bY = startSideY + bH / 2;
          startSideY += bH;

          const branchX = direction === 1 ? startX : startX - L1_WIDTH;

          nodes.push({
            ...bNode,
            x: branchX,
            y: bY,
            width: L1_WIDTH,
            height: L1_HEIGHT,
            side: side,
            isCollapsed: collapsedIds.has(bNode.id),
            hasChildren: Array.isArray(bNode.children) && bNode.children.length > 0
          });

          // Link from Root to Branch
          const rootAnchorX = direction === 1 ? ROOT_WIDTH / 2 : -ROOT_WIDTH / 2;
          const branchAnchorX = direction === 1 ? branchX : branchX + L1_WIDTH;
          links.push({
            id: `link-root-${bNode.id}`,
            x1: rootAnchorX,
            y1: 0,
            x2: branchAnchorX,
            y2: bY + L1_HEIGHT / 2,
            color: bNode.color || '#CBD5E1'
          });

          // Render Sub-children if not collapsed
          if (!collapsedIds.has(bNode.id) && Array.isArray(bNode.children) && bNode.children.length > 0) {
            const childStartX = direction === 1 ? branchX + L1_WIDTH + 80 : branchX - 80 - L2_WIDTH;
            const childTotalH = bNode.children.length * 85;
            let childY = bY - childTotalH / 2 + 40;

            bNode.children.forEach((cNode, cIdx) => {
              nodes.push({
                ...cNode,
                x: childStartX,
                y: childY,
                width: L2_WIDTH,
                height: L2_HEIGHT,
                side: side,
                isCollapsed: collapsedIds.has(cNode.id),
                hasChildren: Array.isArray(cNode.children) && cNode.children.length > 0
              });

              // Link from Branch to Child
              const bAttachX = direction === 1 ? branchX + L1_WIDTH : branchX;
              const cAttachX = direction === 1 ? childStartX : childStartX + L2_WIDTH;
              links.push({
                id: `link-${bNode.id}-${cNode.id}`,
                x1: bAttachX,
                y1: bY + L1_HEIGHT / 2,
                x2: cAttachX,
                y2: childY + L2_HEIGHT / 2,
                color: bNode.color || '#CBD5E1'
              });

              childY += 85;
            });
          }
        });
      };

      layoutSideWing(rightBranches, 1);
      layoutSideWing(leftBranches, -1);

    } else {
      // Horizontal Tree layout (Left to Right)
      nodes.push({
        ...rootData,
        x: -300,
        y: 0,
        width: ROOT_WIDTH,
        height: ROOT_HEIGHT,
        side: 'right'
      });

      const branches = rootData.children || [];
      const branchHeights = branches.map((branch) => {
        if (collapsedIds.has(branch.id)) return 110;
        const leafCount = Array.isArray(branch.children) ? branch.children.length : 0;
        return Math.max(110, leafCount * 85);
      });

      const totalH = branchHeights.reduce((acc, h) => acc + h, 0);
      let currentY = -totalH / 2 + 50;

      branches.forEach((bNode, bIdx) => {
        const bH = branchHeights[bIdx];
        const bY = currentY + bH / 2;
        currentY += bH;

        const bX = 20;

        nodes.push({
          ...bNode,
          x: bX,
          y: bY,
          width: L1_WIDTH,
          height: L1_HEIGHT,
          side: 'right',
          isCollapsed: collapsedIds.has(bNode.id),
          hasChildren: Array.isArray(bNode.children) && bNode.children.length > 0
        });

        links.push({
          id: `link-root-${bNode.id}`,
          x1: -300 + ROOT_WIDTH,
          y1: ROOT_HEIGHT / 2,
          x2: bX,
          y2: bY + L1_HEIGHT / 2,
          color: bNode.color || '#CBD5E1'
        });

        if (!collapsedIds.has(bNode.id) && Array.isArray(bNode.children) && bNode.children.length > 0) {
          const childStartX = bX + L1_WIDTH + 80;
          const childTotalH = bNode.children.length * 85;
          let childY = bY - childTotalH / 2 + 40;

          bNode.children.forEach((cNode) => {
            nodes.push({
              ...cNode,
              x: childStartX,
              y: childY,
              width: L2_WIDTH,
              height: L2_HEIGHT,
              side: 'right',
              isCollapsed: collapsedIds.has(cNode.id),
              hasChildren: Array.isArray(cNode.children) && cNode.children.length > 0
            });

            links.push({
              id: `link-${bNode.id}-${cNode.id}`,
              x1: bX + L1_WIDTH,
              y1: bY + L1_HEIGHT / 2,
              x2: childStartX,
              y2: childY + L2_HEIGHT / 2,
              color: bNode.color || '#CBD5E1'
            });

            childY += 85;
          });
        }
      });
    }

    return { renderedNodes: nodes, renderedLinks: links };
  }, [rootData, layoutMode, collapsedIds]);

  // Export Mind Map as SVG file
  const handleExportSVG = () => {
    try {
      if (!svgRef.current) return;
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgRef.current);

      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(lectureData?.title || 'mindmap').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_mindmap.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Mind Map SVG exported successfully!");
    } catch (err) {
      console.error("Export SVG failed:", err);
      toast.error("Failed to export SVG image");
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm ${isFullscreen ? 'p-0' : ''}`}>
      <motion.div 
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className={`w-full ${isFullscreen ? 'h-full rounded-none' : 'h-[92vh] max-w-7xl rounded-3xl'} bg-[#FFFDF9] border-4 border-black shadow-[10px_10px_0px_#000] flex flex-col overflow-hidden relative`}
      >
        
        {/* ================================================================= */}
        {/* TOP TOOLBAR / HEADER                                             */}
        {/* ================================================================= */}
        <div className="px-5 py-3.5 bg-white border-b-4 border-black flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
          
          {/* Title & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1C5] border-3 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                  Interactive Concept Mind Map
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-[#C7E9DE] border-2 border-black text-[10px] font-mono font-black uppercase text-black shadow-[1px_1px_0px_#000]">
                  {renderedNodes.length} Nodes
                </span>
              </div>
              <p className="text-[11px] font-bold text-zinc-600 hidden sm:block">
                Drag canvas to explore • Click any node for in-depth breakdown
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, laws, formulas..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-bold rounded-xl border-2 border-black bg-zinc-50 focus:bg-white focus:outline-none focus:shadow-[2px_2px_0px_#000] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-black cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Layout Toggle */}
            <div className="inline-flex rounded-xl border-2 border-black bg-zinc-100 p-0.5 shadow-[2px_2px_0px_#000]">
              <button 
                onClick={() => setLayoutMode('bidirectional')}
                className={`px-2.5 py-1 text-[11px] font-mono font-black rounded-lg transition-all cursor-pointer ${layoutMode === 'bidirectional' ? 'bg-[#FFCCD5] text-black border border-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600 hover:text-black'}`}
                title="Buzan Mind Map (Branches left and right)"
              >
                Radial Orbit
              </button>
              <button 
                onClick={() => setLayoutMode('horizontal')}
                className={`px-2.5 py-1 text-[11px] font-mono font-black rounded-lg transition-all cursor-pointer ${layoutMode === 'horizontal' ? 'bg-[#C7E9DE] text-black border border-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600 hover:text-black'}`}
                title="Horizontal Tree (Left to Right)"
              >
                Tree Flow
              </button>
            </div>

            {/* AI Re-synthesize */}
            {onRegenerate && (
              <button 
                onClick={onRegenerate}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-[#FFF1C5] border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black text-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Re-synthesize mind map hierarchy using Groq AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span className="hidden sm:inline">AI Deep Map</span>
              </button>
            )}

            {/* Export SVG/Image */}
            <button 
              onClick={handleExportSVG}
              className="p-1.5 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-zinc-100 cursor-pointer"
              title="Download Mind Map as SVG Image"
            >
              <Download className="w-4 h-4 text-black" />
            </button>

            {/* Fullscreen Toggle */}
            <button 
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-zinc-100 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-black" /> : <Maximize2 className="w-4 h-4 text-black" />}
            </button>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#FFCCD5] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-rose-300 hover:rotate-6 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4 text-black" />
            </button>

          </div>
        </div>

        {/* ================================================================= */}
        {/* INTERACTIVE CANVAS AREA                                          */}
        {/* ================================================================= */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 relative overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#FFFDF9]"
          style={{
            backgroundImage: `radial-gradient(#d1d5db 1.2px, transparent 1.2px)`,
            backgroundSize: '24px 24px'
          }}
        >

          {/* SVG Canvas for Connectors & Nodes */}
          <svg 
            ref={svgRef}
            className="w-full h-full absolute inset-0 pointer-events-none"
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render Connecting Bezier Paths */}
              {renderedLinks.map((link) => {
                const dx = link.x2 - link.x1;
                const curvature = 0.5;
                const hx1 = link.x1 + dx * curvature;
                const hy1 = link.y1;
                const hx2 = link.x1 + dx * (1 - curvature);
                const hy2 = link.y2;
                const d = `M ${link.x1} ${link.y1} C ${hx1} ${hy1}, ${hx2} ${hy2}, ${link.x2} ${link.y2}`;

                return (
                  <g key={link.id}>
                    {/* Shadow path */}
                    <path 
                      d={d}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Colored overlay path */}
                    <path 
                      d={d}
                      fill="none"
                      stroke={link.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* HTML Nodes Overlay (Transform synced with SVG) */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {renderedNodes.map((node) => {
              const matches = isSearchMatch(node);
              const isSelected = selectedNode?.id === node.id;

              if (node.isRoot) {
                // ROOT NODE
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="mindmap-interactive-node absolute pointer-events-auto cursor-pointer p-4 rounded-3xl border-4 border-black shadow-[6px_6px_0px_#000] hover:scale-105 transition-transform flex flex-col items-center justify-center text-center"
                    style={{
                      left: node.x - node.width / 2,
                      top: node.y - node.height / 2,
                      width: node.width,
                      backgroundColor: node.color || '#FFF1C5'
                    }}
                  >
                    {node.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-black text-white text-[9px] font-mono font-black uppercase mb-1.5">
                        {node.badge}
                      </span>
                    )}
                    <h2 className="text-sm font-black text-black leading-snug line-clamp-2">
                      {node.title}
                    </h2>
                  </div>
                );
              }

              // REGULAR / MODULE / LEAF NODE
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`mindmap-interactive-node absolute pointer-events-auto cursor-pointer p-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#000] transition-all flex flex-col justify-between ${isSelected ? 'ring-4 ring-indigo-500' : ''} ${matches ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    minHeight: node.height,
                    backgroundColor: node.color || '#FFF9F5'
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      {node.badge && (
                        <span className="px-1.5 py-0.5 rounded-md bg-white border border-black text-[9px] font-mono font-black uppercase text-black shrink-0">
                          {node.badge}
                        </span>
                      )}

                      {/* Expand / Collapse Button if has children */}
                      {node.hasChildren && (
                        <button
                          onClick={(e) => toggleCollapse(node.id, e)}
                          className="w-5 h-5 rounded-md bg-white border border-black flex items-center justify-center hover:bg-zinc-100 cursor-pointer shadow-[1px_1px_0px_#000] shrink-0"
                          title={node.isCollapsed ? "Expand Branch" : "Collapse Branch"}
                        >
                          {node.isCollapsed ? (
                            <Plus className="w-3 h-3 text-black" />
                          ) : (
                            <Minus className="w-3 h-3 text-black" />
                          )}
                        </button>
                      )}
                    </div>

                    <h4 className="text-xs font-black text-black leading-tight line-clamp-2">
                      {node.title}
                    </h4>

                    {node.description && (
                      <p className="text-[10px] font-medium text-zinc-700 leading-snug line-clamp-2 mt-1">
                        {node.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Canvas Controls (Bottom Left) */}
          <div className="absolute left-4 bottom-4 z-20 flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#000]">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.15, 2.5))}
              className="p-1.5 rounded-xl hover:bg-zinc-100 border border-black cursor-pointer shadow-[1px_1px_0px_#000]"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-black" />
            </button>
            <span className="text-[11px] font-mono font-black px-1.5 text-black">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.35))}
              className="p-1.5 rounded-xl hover:bg-zinc-100 border border-black cursor-pointer shadow-[1px_1px_0px_#000]"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-black" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded-xl hover:bg-zinc-100 border border-black cursor-pointer shadow-[1px_1px_0px_#000]"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4 text-black" />
            </button>

            <div className="w-[1px] h-5 bg-black mx-1" />

            <button
              onClick={handleExpandAll}
              className="px-2 py-1 text-[10px] font-mono font-black bg-[#C7E9DE] rounded-xl border border-black hover:bg-[#b0ded2] cursor-pointer shadow-[1px_1px_0px_#000]"
              title="Expand All Branches"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2 py-1 text-[10px] font-mono font-black bg-[#FFCCD5] rounded-xl border border-black hover:bg-[#ffb3c1] cursor-pointer shadow-[1px_1px_0px_#000]"
              title="Collapse to Core"
            >
              Collapse
            </button>
          </div>

          {/* Quick Navigation / Help Overlay (Bottom Right) */}
          <div className="absolute right-4 bottom-4 z-20 hidden md:flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border-2 border-black text-[10px] font-mono font-bold text-zinc-700 shadow-[2px_2px_0px_#000]">
            <Move className="w-3.5 h-3.5" />
            <span>Click & Drag to Pan • Scroll to Zoom</span>
          </div>

        </div>

        {/* ================================================================= */}
        {/* SLIDE-OVER NODE DETAIL INSPECTOR DRAWER                           */}
        {/* ================================================================= */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:w-96 bg-white border-l-4 border-black shadow-[-8px_0px_0px_#000] p-6 absolute right-0 top-0 bottom-0 z-30 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-zinc-300 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: selectedNode.color || '#FFF1C5' }} />
                    <span className="text-[11px] font-mono font-black uppercase text-zinc-500">
                      {selectedNode.badge || (selectedNode.isRoot ? 'CENTRAL HUB' : 'CONCEPT NODE')}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
                  >
                    <X className="w-4 h-4 text-black" />
                  </button>
                </div>

                {/* Node Title */}
                <h3 className="text-xl font-black text-black tracking-tight leading-snug mb-3">
                  {selectedNode.title}
                </h3>

                {/* Teacher Emphasis Note if attached */}
                {selectedNode.teacherEmphasis && (
                  <div className="p-3 rounded-xl bg-[#FFFBEB] border-2 border-black shadow-[2px_2px_0px_#000] mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-black text-amber-900 mb-1">
                      <span>🎙️ INSTRUCTOR EMPHASIS</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-800 italic">
                      "{selectedNode.teacherEmphasis}"
                    </p>
                  </div>
                )}

                {/* Detailed Conceptual Explanation */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-black uppercase text-zinc-500">
                    Conceptual Breakdown
                  </h4>
                  <div className="p-4 rounded-2xl bg-zinc-50 border-2 border-black text-xs font-medium text-zinc-800 leading-relaxed max-h-64 overflow-y-auto">
                    {selectedNode.description || "Foundational topic establishing core principles in this lecture."}
                  </div>
                </div>

                {/* Sub-branches overview */}
                {Array.isArray(selectedNode.children) && selectedNode.children.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-xs font-mono font-black uppercase text-zinc-500 mb-2">
                      Connected Sub-Concepts ({selectedNode.children.length})
                    </h4>
                    <div className="space-y-1.5">
                      {selectedNode.children.map((child) => (
                        <div 
                          key={child.id}
                          onClick={() => setSelectedNode(child)}
                          className="p-2.5 rounded-xl border border-black bg-white hover:bg-[#FFF9F5] flex items-center justify-between text-xs font-bold cursor-pointer transition-colors shadow-[1px_1px_0px_#000]"
                        >
                          <span className="line-clamp-1">{child.title}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t-2 border-dashed border-zinc-300 space-y-2 mt-6">
                <button
                  onClick={() => handleCopyNode(selectedNode)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] hover:bg-zinc-50 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "Copied to Clipboard!" : "Copy Concept Note"}</span>
                </button>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-black text-white text-xs font-black shadow-[2px_2px_0px_#888] hover:bg-zinc-800 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};

export default MindMapModal;
