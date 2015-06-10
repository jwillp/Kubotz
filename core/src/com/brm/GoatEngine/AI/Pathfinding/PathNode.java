package com.brm.GoatEngine.AI.Pathfinding;

import com.badlogic.gdx.math.Vector2;

/**
 * A node for pathfinding (used for connectivity graph
 */
public class PathNode {

    public Vector2 position;
    public PathNode parent;
    public int gCost = 0;  //The movement cost from START to THIS node.
    public int hCost = 0;  //ESTIMATED movement cost from THIS node to the END. closer to the goal == smaller number

    public boolean isLedge = false; //whether it is a ledge or not
    public boolean isWalkable = true; //whether it is isWalkable or not

    public PathNode(PathNode parent, Vector2 position){
        this.parent = parent;
        this.position = position;
    }

    public void resetCost(){
        parent = null;
        gCost = 0;
        hCost = 0;
    }


    public int getFCost(){
        //Most likely path + shortest
        return gCost + hCost;
    }


}