import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Brain, 
  Copy, 
  CheckCircle2, 
  ChevronRight, 
  Move,
  FileImage,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Helper to split text into clean SVG-compatible lines
 */
function wrapSvgText(text, maxCharsPerLine = 22, maxLines = 2) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) {
        break;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.length > 0) {
    const totalWordsRendered = lines.join(' ').split(' ').length;
    if (totalWordsRendered < words.length) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/\.*$/, '') + '...';
    }
  }

  return lines;
}

/**
 * Interactive Concept Mind Map Studio Component
 * - Rendered in document.body via createPortal to prevent stacking/collapsing with website navbar
 * - Full SVG-based node rendering guarantees both branches AND boxes/content are in the downloaded file
 * - High-DPI PNG and vector SVG export
 * - Interactive pan & zoom, collapsible branches, and search
 */
const MindMapModal = ({ isOpen, onClose, lectureData, mindMapData, loading, onRegenerate }) => {
  if (!isOpen) return null;

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const [layoutMode, setLayoutMode] = useState('bidirectional');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const rootData = useMemo(() => {
    return mindMapData?.root || null;
  }, [mindMapData]);

  // Center the mind map on mount or layout switch
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
      setZoom(1);
    }
  }, [layoutMode]);

  // Canvas Pan Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.mindmap-node-group')) return;
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

  // Canvas Zoom Handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.35), 2.5));
  };

  const resetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
      setZoom(1);
    }
  };

  // Toggle Collapse
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

  const handleCopyNode = (node) => {
    const text = `${node.title}\n\n${node.description || ''}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Concept copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

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
  // MIND MAP LAYOUT MATH
  // =========================================================================
  const { renderedNodes, renderedLinks } = useMemo(() => {
    if (!rootData) return { renderedNodes: [], renderedLinks: [] };

    const nodes = [];
    const links = [];

    const ROOT_WIDTH = 250;
    const ROOT_HEIGHT = 85;
    const L1_WIDTH = 230;
    const L1_HEIGHT = 90;
    const L2_WIDTH = 205;
    const L2_HEIGHT = 75;

    if (layoutMode === 'bidirectional') {
      // Bi-directional layout (Buzan Style)
      const rightBranches = [];
      const leftBranches = [];

      (rootData.children || []).forEach((child, idx) => {
        if (idx % 2 === 0) {
          rightBranches.push(child);
        } else {
          leftBranches.push(child);
        }
      });

      // Root Node centered at (-ROOT_WIDTH/2, -ROOT_HEIGHT/2)
      nodes.push({
        ...rootData,
        x: -ROOT_WIDTH / 2,
        y: -ROOT_HEIGHT / 2,
        width: ROOT_WIDTH,
        height: ROOT_HEIGHT,
        side: 'center'
      });

      // Layout Right & Left Wings
      const layoutSide = (branches, direction) => {
        const side = direction === 1 ? 'right' : 'left';
        const startX = direction === 1 ? (ROOT_WIDTH / 2 + 90) : (-ROOT_WIDTH / 2 - 90 - L1_WIDTH);

        const branchHeights = branches.map((b) => {
          if (collapsedIds.has(b.id)) return 115;
          const count = Array.isArray(b.children) ? b.children.length : 0;
          return Math.max(115, count * 95);
        });

        const totalH = branchHeights.reduce((acc, h) => acc + h, 0);
        let currentY = -totalH / 2 + 55;

        branches.forEach((bNode, bIdx) => {
          const bH = branchHeights[bIdx];
          const bY = currentY + (bH - L1_HEIGHT) / 2;
          currentY += bH;

          nodes.push({
            ...bNode,
            x: startX,
            y: bY,
            width: L1_WIDTH,
            height: L1_HEIGHT,
            side: side,
            isCollapsed: collapsedIds.has(bNode.id),
            hasChildren: Array.isArray(bNode.children) && bNode.children.length > 0
          });

          // Link from Root to Branch
          const rootAnchorX = direction === 1 ? ROOT_WIDTH / 2 : -ROOT_WIDTH / 2;
          const branchAnchorX = direction === 1 ? startX : startX + L1_WIDTH;
          links.push({
            id: `link-root-${bNode.id}`,
            x1: rootAnchorX,
            y1: 0,
            x2: branchAnchorX,
            y2: bY + L1_HEIGHT / 2,
            color: bNode.color || '#CBD5E1'
          });

          // Children if expanded
          if (!collapsedIds.has(bNode.id) && Array.isArray(bNode.children) && bNode.children.length > 0) {
            const childStartX = direction === 1 ? (startX + L1_WIDTH + 80) : (startX - 80 - L2_WIDTH);
            const childTotalH = bNode.children.length * 95;
            let cY = bY + L1_HEIGHT / 2 - childTotalH / 2 + 10;

            bNode.children.forEach((cNode) => {
              nodes.push({
                ...cNode,
                x: childStartX,
                y: cY,
                width: L2_WIDTH,
                height: L2_HEIGHT,
                side: side,
                isCollapsed: collapsedIds.has(cNode.id),
                hasChildren: Array.isArray(cNode.children) && cNode.children.length > 0
              });

              const bAttachX = direction === 1 ? (startX + L1_WIDTH) : startX;
              const cAttachX = direction === 1 ? childStartX : (childStartX + L2_WIDTH);

              links.push({
                id: `link-${bNode.id}-${cNode.id}`,
                x1: bAttachX,
                y1: bY + L1_HEIGHT / 2,
                x2: cAttachX,
                y2: cY + L2_HEIGHT / 2,
                color: bNode.color || '#CBD5E1'
              });

              cY += 95;
            });
          }
        });
      };

      layoutSide(rightBranches, 1);
      layoutSide(leftBranches, -1);

    } else {
      // Horizontal Tree Flow (Left to Right)
      const rootX = -320;
      const rootY = -ROOT_HEIGHT / 2;

      nodes.push({
        ...rootData,
        x: rootX,
        y: rootY,
        width: ROOT_WIDTH,
        height: ROOT_HEIGHT,
        side: 'right'
      });

      const branches = rootData.children || [];
      const branchHeights = branches.map((b) => {
        if (collapsedIds.has(b.id)) return 115;
        const count = Array.isArray(b.children) ? b.children.length : 0;
        return Math.max(115, count * 95);
      });

      const totalH = branchHeights.reduce((acc, h) => acc + h, 0);
      let currentY = -totalH / 2 + 55;

      branches.forEach((bNode, bIdx) => {
        const bH = branchHeights[bIdx];
        const bY = currentY + (bH - L1_HEIGHT) / 2;
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
          x1: rootX + ROOT_WIDTH,
          y1: rootY + ROOT_HEIGHT / 2,
          x2: bX,
          y2: bY + L1_HEIGHT / 2,
          color: bNode.color || '#CBD5E1'
        });

        if (!collapsedIds.has(bNode.id) && Array.isArray(bNode.children) && bNode.children.length > 0) {
          const childStartX = bX + L1_WIDTH + 80;
          const childTotalH = bNode.children.length * 95;
          let cY = bY + L1_HEIGHT / 2 - childTotalH / 2 + 10;

          bNode.children.forEach((cNode) => {
            nodes.push({
              ...cNode,
              x: childStartX,
              y: cY,
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
              y2: cY + L2_HEIGHT / 2,
              color: bNode.color || '#CBD5E1'
            });

            cY += 95;
          });
        }
      });
    }

    return { renderedNodes: nodes, renderedLinks: links };
  }, [rootData, layoutMode, collapsedIds]);

  // =========================================================================
  // FULL DOWNLOAD ENGINE (BRANCHES + BOXES + TEXT)
  // =========================================================================

  // Generate complete self-contained SVG string with all nodes and paths
  const getFullSvgString = () => {
    if (!svgRef.current || renderedNodes.length === 0) return null;

    const padding = 120;
    const minX = Math.min(...renderedNodes.map(n => n.x)) - padding;
    const maxX = Math.max(...renderedNodes.map(n => n.x + n.width)) + padding;
    const minY = Math.min(...renderedNodes.map(n => n.y)) - padding;
    const maxY = Math.max(...renderedNodes.map(n => n.y + n.height)) + padding;
    const totalW = Math.max(900, Math.round(maxX - minX));
    const totalH = Math.max(650, Math.round(maxY - minY));

    const viewportGroup = svgRef.current.querySelector('g.mindmap-viewport');
    if (!viewportGroup) return null;

    const contentSvg = viewportGroup.innerHTML;

    return {
      svgString: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="${minX} ${minY} ${totalW} ${totalH}">
  <defs>
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    </style>
  </defs>
  <rect x="${minX}" y="${minY}" width="${totalW}" height="${totalH}" fill="#FFFDF9" />
  ${contentSvg}
</svg>`,
      width: totalW,
      height: totalH
    };
  };

  // Download High-Resolution PNG
  const handleDownloadPNG = () => {
    try {
      setExporting(true);
      const data = getFullSvgString();
      if (!data) {
        toast.error("Mind map content not ready");
        setExporting(false);
        return;
      }

      const { svgString, width, height } = data;
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const scale = 2; // Crisp 2x retina export
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (!blob) {
            handleDownloadSVG();
            return;
          }
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${(lectureData?.title || 'mindmap').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_mindmap.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
          setExporting(false);
          toast.success("Complete Mind Map PNG downloaded!");
        }, 'image/png');
      };

      img.onerror = () => {
        handleDownloadSVG();
      };

      img.src = url;
    } catch (err) {
      console.error("PNG export error:", err);
      handleDownloadSVG();
    }
  };

  // Download Standalone Vector SVG
  const handleDownloadSVG = () => {
    try {
      const data = getFullSvgString();
      if (!data) return;

      const blob = new Blob([data.svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(lectureData?.title || 'mindmap').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_mindmap.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExporting(false);
      toast.success("Mind Map SVG exported with complete boxes & content!");
    } catch (err) {
      console.error("SVG export error:", err);
      toast.error("Failed to export SVG");
      setExporting(false);
    }
  };

  // Render modal into document.body to avoid stacking context collisions
  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm ${isFullscreen ? 'p-0' : ''}`}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full ${isFullscreen ? 'h-full rounded-none' : 'h-[90vh] max-w-7xl rounded-3xl'} bg-[#FFFDF9] border-4 border-black shadow-[10px_10px_0px_#000] flex flex-col overflow-hidden relative`}
      >
        
        {/* ================================================================= */}
        {/* TOP TOOLBAR / HEADER                                             */}
        {/* ================================================================= */}
        <div className="px-5 py-3.5 bg-white border-b-4 border-black flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
          
          {/* Brand & Badge */}
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
                Drag canvas to pan • Click any node for in-depth breakdown
              </p>
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative flex-1 max-w-xs min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, formulas..."
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

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Layout Toggle */}
            <div className="inline-flex rounded-xl border-2 border-black bg-zinc-100 p-0.5 shadow-[2px_2px_0px_#000]">
              <button 
                onClick={() => setLayoutMode('bidirectional')}
                className={`px-2.5 py-1 text-[11px] font-mono font-black rounded-lg transition-all cursor-pointer ${layoutMode === 'bidirectional' ? 'bg-[#FFCCD5] text-black border border-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600 hover:text-black'}`}
                title="Buzan Mind Map (Radial Orbit)"
              >
                Radial Orbit
              </button>
              <button 
                onClick={() => setLayoutMode('horizontal')}
                className={`px-2.5 py-1 text-[11px] font-mono font-black rounded-lg transition-all cursor-pointer ${layoutMode === 'horizontal' ? 'bg-[#C7E9DE] text-black border border-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600 hover:text-black'}`}
                title="Horizontal Tree Flow"
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

            {/* Download PNG Button */}
            <button 
              onClick={handleDownloadPNG}
              disabled={exporting}
              className="px-3 py-1.5 rounded-xl bg-[#C7E9DE] border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-black text-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Download Complete Mind Map Image with all boxes & content"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>{exporting ? "Exporting..." : "Download PNG"}</span>
            </button>

            {/* Download SVG Button */}
            <button 
              onClick={handleDownloadSVG}
              className="p-1.5 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-zinc-100 cursor-pointer"
              title="Download Vector SVG"
            >
              <FileImage className="w-4 h-4 text-black" />
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
        {/* INTERACTIVE CANVAS (SVG WITH FULL VECTOR NODES & BOXES)           */}
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

          <svg 
            ref={svgRef}
            className="w-full h-full absolute inset-0"
          >
            <g className="mindmap-viewport" transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              
              {/* 1. Connecting Bezier Branch Lines */}
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
                    {/* Shadow line */}
                    <path 
                      d={d}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Color accent line */}
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

              {/* 2. Full Vector Nodes with Boxes, Badges & Text (Included in Export!) */}
              {renderedNodes.map((node) => {
                const matches = isSearchMatch(node);
                const isSelected = selectedNode?.id === node.id;

                const titleLines = wrapSvgText(node.title, node.isRoot ? 24 : 20, 2);
                const descLines = !node.isRoot && node.description 
                  ? wrapSvgText(node.description, 26, 2) 
                  : [];

                const badgeText = node.badge ? String(node.badge).toUpperCase() : null;
                const badgeWidth = badgeText ? Math.min(node.width - 24, badgeText.length * 6.5 + 14) : 0;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="mindmap-node-group cursor-pointer select-none"
                  >
                    {/* Drop shadow box */}
                    <rect
                      x="4"
                      y="4"
                      width={node.width}
                      height={node.height}
                      rx="16"
                      ry="16"
                      fill="#000000"
                    />

                    {/* Main card box */}
                    <rect
                      x="0"
                      y="0"
                      width={node.width}
                      height={node.height}
                      rx="16"
                      ry="16"
                      fill={node.color || '#FFF1C5'}
                      stroke="#000000"
                      strokeWidth={node.isRoot ? "4" : "3"}
                    />

                    {/* Selected / Search Highlighting */}
                    {isSelected && (
                      <rect
                        x="-4"
                        y="-4"
                        width={node.width + 8}
                        height={node.height + 8}
                        rx="20"
                        ry="20"
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="3.5"
                        strokeDasharray="6 4"
                      />
                    )}

                    {matches && (
                      <rect
                        x="-4"
                        y="-4"
                        width={node.width + 8}
                        height={node.height + 8}
                        rx="20"
                        ry="20"
                        fill="none"
                        stroke="#EAB308"
                        strokeWidth="3.5"
                      />
                    )}

                    {/* Category Badge Pill */}
                    {badgeText && (
                      <g transform="translate(12, 10)">
                        <rect
                          x="0"
                          y="0"
                          width={badgeWidth}
                          height="16"
                          rx="4"
                          fill={node.isRoot ? "#000000" : "#FFFFFF"}
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                        <text
                          x={badgeWidth / 2}
                          y="11.5"
                          textAnchor="middle"
                          fontSize="8.5"
                          fontWeight="900"
                          fontFamily="monospace, sans-serif"
                          fill={node.isRoot ? "#FFFFFF" : "#000000"}
                        >
                          {badgeText}
                        </text>
                      </g>
                    )}

                    {/* Expand / Collapse Toggle if has children */}
                    {node.hasChildren && (
                      <g
                        transform={`translate(${node.width - 26}, 9)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(node.id, e);
                        }}
                        className="hover:scale-110 cursor-pointer"
                      >
                        <rect
                          x="0"
                          y="0"
                          width="16"
                          height="16"
                          rx="4"
                          fill="#FFFFFF"
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                        <text
                          x="8"
                          y="12"
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="900"
                          fontFamily="sans-serif"
                          fill="#000000"
                        >
                          {node.isCollapsed ? "+" : "-"}
                        </text>
                      </g>
                    )}

                    {/* Multiline Node Title */}
                    {titleLines.map((line, lIdx) => (
                      <text
                        key={lIdx}
                        x={node.isRoot ? node.width / 2 : 12}
                        y={node.isRoot ? 40 + lIdx * 15 : (badgeText ? 39 + lIdx * 13 : 28 + lIdx * 13)}
                        textAnchor={node.isRoot ? "middle" : "start"}
                        fontSize={node.isRoot ? "13" : "11"}
                        fontWeight="900"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fill="#000000"
                      >
                        {line}
                      </text>
                    ))}

                    {/* Subtitle / Short Description */}
                    {!node.isRoot && descLines.map((line, dIdx) => (
                      <text
                        key={dIdx}
                        x="12"
                        y={badgeText ? 43 + titleLines.length * 13 + dIdx * 11 : 32 + titleLines.length * 13 + dIdx * 11}
                        fontSize="8.5"
                        fontWeight="600"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fill="#374151"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}

            </g>
          </svg>

          {/* Floating Controls Bar (Bottom Left) */}
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

          {/* Quick Tip Overlay */}
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

                <h3 className="text-xl font-black text-black tracking-tight leading-snug mb-3">
                  {selectedNode.title}
                </h3>

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

                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-black uppercase text-zinc-500">
                    Conceptual Breakdown
                  </h4>
                  <div className="p-4 rounded-2xl bg-zinc-50 border-2 border-black text-xs font-medium text-zinc-800 leading-relaxed max-h-64 overflow-y-auto">
                    {selectedNode.description || "Foundational topic establishing core principles in this lecture."}
                  </div>
                </div>

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
    </div>,
    document.body
  );
};

export default MindMapModal;
