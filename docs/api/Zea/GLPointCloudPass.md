<a name="GLPointCloudPass"></a>

### GLPointCloudPass 
The GLPointCloudPass Class


**Extends**: <code>GLPass</code>  

* [GLPointCloudPass ⇐ <code>GLPass</code>](#GLPointCloudPass)
    * [new GLPointCloudPass()](#new-GLPointCloudPass)
    * [init(renderer, passIndex)](#init)
    * [addPotreeasset(pointcloudAsset)](#addPotreeasset)
    * [setViewport(viewport)](#setViewport)
    * [updateVisibilityStructures(priorityQueue) ⇒ <code>array</code>](#updateVisibilityStructures)
    * [updateVisibility()](#updateVisibility)
    * [computeVisibilityTextureData(nodes) ⇒ <code>Map</code>](#computeVisibilityTextureData)
    * [draw(renderstate)](#draw)
    * [drawHighlightedGeoms(renderstate)](#drawHighlightedGeoms)
    * [drawGeomData(renderstate)](#drawGeomData)
    * [getGeomItemAndDist(geomData)](#getGeomItemAndDist)

<a name="new_GLPointCloudPass_new"></a>

### new GLPointCloudPass
Creates an instance of GLPointCloudPass.

<a name="GLPointCloudPass+init"></a>

### init
The init method.



| Param | Type | Description |
| --- | --- | --- |
| renderer | <code>any</code> | The renderer param. |
| passIndex | <code>any</code> | The passIndex param. |

<a name="GLPointCloudPass+addPotreeasset"></a>

### addPotreeasset
The addPotreeasset method



| Param | Type | Description |
| --- | --- | --- |
| pointcloudAsset | <code>\*</code> | The pointcloudAsset value |

<a name="GLPointCloudPass+setViewport"></a>

### setViewport
The setViewport method



| Param | Type | Description |
| --- | --- | --- |
| viewport | <code>\*</code> | The viewport value |

<a name="GLPointCloudPass+updateVisibilityStructures"></a>

### updateVisibilityStructures
The updateVisibilityStructures method


**Returns**: <code>array</code> - - The result  

| Param | Type | Description |
| --- | --- | --- |
| priorityQueue | <code>\*</code> | The priorityQueue value |

<a name="GLPointCloudPass+updateVisibility"></a>

### updateVisibility
The updateVisibility method


<a name="GLPointCloudPass+computeVisibilityTextureData"></a>

### computeVisibilityTextureData
The computeVisibilityTextureData method


**Returns**: <code>Map</code> - - The result  

| Param | Type | Description |
| --- | --- | --- |
| nodes | <code>\*</code> | the nodes value |

<a name="GLPointCloudPass+draw"></a>

### draw
The draw method.



| Param | Type | Description |
| --- | --- | --- |
| renderstate | <code>any</code> | The renderstate param. |

<a name="GLPointCloudPass+drawHighlightedGeoms"></a>

### drawHighlightedGeoms
The drawHighlightedGeoms method.



| Param | Type | Description |
| --- | --- | --- |
| renderstate | <code>any</code> | The renderstate param. |

<a name="GLPointCloudPass+drawGeomData"></a>

### drawGeomData
The drawGeomData method.



| Param | Type | Description |
| --- | --- | --- |
| renderstate | <code>any</code> | The renderstate param. |

<a name="GLPointCloudPass+getGeomItemAndDist"></a>

### getGeomItemAndDist
The getGeomItemAndDist method.



| Param | Type | Description |
| --- | --- | --- |
| geomData | <code>any</code> | The geomData param. |

