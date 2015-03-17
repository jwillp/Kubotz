package com.brm.GoatEngine.AI.Pathfinding;

import com.badlogic.gdx.math.Vector2;

import java.util.ArrayList;

/**
 * A node for pathfinding (used for connectivity graph
 */
public class Node {

    public Vector2 position;
    public Node parent;
    public int gCost = 0;  //The movement cost from START to THIS node.
    public int hCost = 0;  //ESTIMATED movement cost from THIS node to the END.

    public boolean isLedge = false; //whether it is a ledge or not

    public Node(Node parent, Vector2 position){
        this.position = position;
    }

    public void resetCost(){
        parent = null;
        gCost = 0;
        hCost = 0;
    }


    public int getFCost(){
        return gCost + hCost;
    }


}
