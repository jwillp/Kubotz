package com.brm.GoatEngine.AI.BehaviourTree;

import com.brm.GoatEngine.Utils.Logger;

import java.util.ArrayList;
import java.util.Hashtable;

/**
* Selectors, Sequences etc... 
**/
public abstract class Composite extends Node {
    
    protected ArrayList<Node> children;
    protected int currentNode; //The index of the current node being processed
    
    
    public Composite(){
        children = new ArrayList<Node>();
        currentNode = 0;
    }


    public Composite(Hashtable<String, Object> blackBoard){
        children = new ArrayList<Node>();
        currentNode = 0;
        this.setBlackBoard(blackBoard);
    }




    /**
     * Adds a node to the current composite
     * @param node
     * @return this for chaining
     */
    public Composite addNode(Node node){
        node.setBlackBoard(this.blackBoard);
        children.add(node);
        return this;
    }

    /**
     * removes a node from the current composite
     * @param node
     */
    public void removeNode(Node node){
        children.remove(node);
    }
    
}
