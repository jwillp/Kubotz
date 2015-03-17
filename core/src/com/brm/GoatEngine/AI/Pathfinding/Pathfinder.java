package com.brm.GoatEngine.AI.Pathfinding;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;

/**
 * Class used to find path
 */
public class Pathfinder {

    public ArrayList<Node> nodes = new ArrayList<Node>();          //All the nodes

    // Nodes to be evaluated
    public ArrayList<Node> openNodes = new ArrayList<Node>();
    // Nodes already evaluated
    public ArrayList<Node> closedNodes = new ArrayList<Node>();

    public final float NODE_SIZE = 0.4f;





    /**
     * Scans the map and generate waypoints on platforms
     * @param platforms
     */
    public void scanMap(ArrayList<Entity> platforms){
        //Scan all isWalkable platforms
        // All isWalkable tiles will be made into a node. Node connection is made
        // from right to left (parent_left)<-[connected]-(child_right)
        // from top to bottom (child_top)-[connected]->(parent_bottom)
        for(Entity platform: platforms){
            PhysicsComponent phys = (PhysicsComponent) platform.getComponent(PhysicsComponent.ID);
            Rectangle rect = phys.getBounds();

            //Add nodes to the left and the right edges of platform as nodes (out of the platform)
            Node leftEdgeNode = new Node(null, new Vector2(rect.getX()-1, rect.getY() + rect.getHeight()));

            Node rightEdgeNode = new Node(null, new Vector2(rect.getX() + rect.getWidth() - NODE_SIZE + 1,
                    rect.getY() + rect.getHeight())
            );

            leftEdgeNode.isLedge = true;
            rightEdgeNode.isLedge = true;

            this.nodes.add(leftEdgeNode);
            this.nodes.add(rightEdgeNode);

            //Add a node for the whole length of the platform
            for(int i =0; i < rect.getWidth(); i++){
                Node nodeWalk = new Node(null, new Vector2(rect.getX() + i, rect.getY() + rect.getHeight()));
                this.nodes.add(nodeWalk);

            }
        }
    }


    /**
     * Returns a list of all the reachable nodes that
     * @return
     */
    private HashSet<Node> getReachableNodes(Vector2 current){

        HashSet<Node> reachableNodes = new HashSet<Node>();

        //Left and Right neighbours
        Node left = getNodeFor(new Vector2(current.x - 1, current.y));
        Node right = getNodeFor(new Vector2(current.x + 1, current.y));
        reachableNodes.add(left);
        reachableNodes.add(right);




        //Jumps and fall off nodes
        int limit = 4;
        for(int x = -limit; x<limit; x++){
            for(int y = -limit; y<limit; y++){
                Node node =  getNodeFor(new Vector2(current.x + x, current.y + y));

                //If jump must be ledge
                if(node.isLedge){
                    reachableNodes.add(node);
                }

            }
        }

        return reachableNodes;
    }



    /**
     * Gets the nearest node for a given position
     * @param position
     * @return
     */
    private Node getNodeFor(Vector2 position){
        Node nearest = null;
        int closesDistance = Integer.MAX_VALUE;
        for(Node node: this.nodes){
            int dist = getManhattanDistance(node.position, position);
            if(dist < closesDistance){
                closesDistance = dist;
                nearest = node;
            }
        }
        return nearest;
    }

    /**
     * Return the manhattan distance
     * distance between two points based on adding the horizontal distance and
     * vertical distances rather than computing the exact difference.
     * closer to the goal == smaller number
     * THIS IS A HEURISTIC
     * @param current
     * @param target
     * @return
     */
    private int getManhattanDistance(Vector2 current, Vector2 target){
        int dx = (int) Math.abs(target.x - current.x); //number of moves in x
        int dy = (int) Math.abs(target.y - current.y); //number of moves in y



        //TODO tweak the manhanttan distance to add a custom cost
        // purely vertical movement are highly expensive
        // diagonal a bit less expansive
        // vertical the least expensive
        int cost = 1;



        return (dx + dy) * cost;
    }




    /**
     * Returns a Path
     * @param start
     * @param end
     * @return
     */
    public ArrayList<Node> findPath(Vector2 start, Vector2 end){

        //Reset in case we have old data.
        this.openNodes.clear();
        this.closedNodes.clear();
        for(Node node: this.nodes){
            node.resetCost();
        }

        //Get node for start and end points
        Node startNode = getNodeFor(start);
        Node endNode = getNodeFor(end);

        // the starting point must be evaluated
        this.openNodes.add(startNode);

        //While there are still nodes to evaluate as potential path nodes
        while(!this.openNodes.isEmpty()){
            Node current = this.openNodes.get(0);
            //GET LOWEST FSCORE i.e. the best node (most likely + shortest path)
            for(Node node: this.openNodes){

                if(node.getFCost() < current.getFCost() || (node.getFCost() == current.getFCost() && node.hCost < current.hCost)){
                    current = node;
                }
            }
            //This node ain't to be considered now
            this.openNodes.remove(current);
            this.closedNodes.add(current);

            //Are we done yet?
            if(current == endNode){
                //PATH FOUND
                return this.tracePath(startNode, endNode);
            }

            //Get Neighbour and see which way to go
            for(Node neighbour : getReachableNodes(current.position)){
                //if the neighbour has already been evaluated.. well we won't do it a second time right?
                if(!neighbour.isWalkable || this.closedNodes.contains(neighbour)){
                   continue;
                }

                //Estimate a FScore to the neighbour (from the current position to the neighbour)
                int distToNeighbour = current.gCost + getManhattanDistance(current.position, neighbour.position);

                //If the dist to neighbour is shorter than the distance from the start node to the neighbour
                // This is more likely to be a good route OR if it is not something we already consider
                if(distToNeighbour < neighbour.gCost || !openNodes.contains(neighbour)){

                    //Determine cost
                    neighbour.gCost = distToNeighbour;
                    neighbour.hCost = getManhattanDistance(neighbour.position, endNode.position);
                    neighbour.parent = current;

                    if(!openNodes.contains(neighbour)){
                        this.openNodes.add(neighbour);
                    }
                }
            }

        }
        // No path was found ==> empty list
        return new ArrayList<Node>();
    }


    /**
     * Trace the path looking at all the connected path
     * @param start
     * @param end
     * @return
     */
    private ArrayList<Node> tracePath(Node start, Node end){
        ArrayList<Node> path = new ArrayList<Node>();
        Node current = end;
        while(current.parent != null){
            path.add(current);
            current = current.parent;
        }

        Collections.reverse(path);
        return path;
    }

}
