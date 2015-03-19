package com.brm.Kubotz.AI;



import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.AI.Pathfinding.Node;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.Utils.GameMath.Vectors;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;

/**
 * Class used to find path
 */
public class KubotzPathFinder {

    public ArrayList<Node> nodes = new ArrayList<Node>();  //All the nodes

    // Nodes to be evaluated
    public ArrayList<Node> openNodes = new ArrayList<Node>();
    // Nodes already evaluated
    public ArrayList<Node> closedNodes = new ArrayList<Node>();


    public ArrayList<Node> path = new ArrayList<Node>();


    public HashSet<Node> reachableNodes = new HashSet<Node>();


    public final float NODE_SIZE = 0.4f;





    /**
     * Scans the map and create waypoints(nodes) on platforms
     * it also creates nodes on left and right edges of air platform (for jumping and falloffs)
     * Finally i creates several AIR nodes for jumps
     * @param platforms
     */
    public void scanMap(ArrayList<Entity> platforms){

        this.nodes.clear();
        for(Entity platform: platforms){
            PhysicsComponent phys = (PhysicsComponent) platform.getComponent(PhysicsComponent.ID);
            Rectangle rect = phys.getBounds();

            //Add a node for the whole length of the platform
            for(float i =0; i < rect.getWidth(); i++){
                Node nodeWalk = new Node(null, new Vector2(rect.getX() + i, rect.getY() + rect.getHeight()));
                //Node nodeBlock = new Node(null, new Vector2(rect.getX() + i, rect.getY()));
                //nodeBlock.isWalkable = false;
                //this.nodes.add(nodeBlock);
                this.nodes.add(nodeWalk);
            }

            //Add nodes to the left and the right edges of platform as nodes (out of the platform)
            Node leftEdgeNode = new Node(null, new Vector2(rect.getX()-1, rect.getY() + rect.getHeight()));

            Node rightEdgeNode = new Node(null, new Vector2(rect.getX() + rect.getWidth() - NODE_SIZE + 1,
                    rect.getY() + rect.getHeight())
            );

            leftEdgeNode.isLedge = true;
            rightEdgeNode.isLedge = true;

            this.nodes.add(leftEdgeNode);
            this.nodes.add(rightEdgeNode);




        }
    }


    /**
     * Returns a list of all the reachable nodes from
     * a current node
     * @return list of all the reachable nodes
     */
    private HashSet<Node> getReachableNodes(Node currentNode){

        HashSet<Node> reachableNodes = new HashSet<Node>();


        // Find direct left and right neighbours
        Node left = getNodeFor(new Vector2(currentNode.position.x - 1, currentNode.position.y));
        Node right = getNodeFor(new Vector2(currentNode.position.x + 1, currentNode.position.y));
        if(left != null) {
            reachableNodes.add(left);
        }
        if (right != null) {
            reachableNodes.add(right);
        }


        //Jump
        int jumpRadius = 6; //TODO deduce this value
        // Check doing a circle of radius
        for(int x = -jumpRadius; x<jumpRadius; x++){
            for(int y = -jumpRadius; y<jumpRadius; y++){
                Node node =  getNodeFor(new Vector2(currentNode.position.x + x, currentNode.position.y + y));
                //We only want to consider the node if it is a ledge because you can only fall down from a ledge
                // or jump towards a ledge
                if(!node.isLedge){
                    continue;
                }
                //When going in in the opposite of the gravity when can never have two consecutive ledges
                if(currentNode.position.y < node.position.y){
                    if(currentNode.isLedge && node.isLedge){
                        continue;
                    }
                }

                //Prevent impossible jumps in Y
                if(Math.abs(node.position.y - currentNode.position.y) > jumpRadius){
                    continue;
                }


                //When going in in the opposite of the gravity when can never have two consecutive ledges
                // (ledges are in air)
                    int MAX_JUMP_LENGTH = 2;
                if( Math.abs(currentNode.position.x - node.position.x) > MAX_JUMP_LENGTH ){
                    if(currentNode.isLedge /*&& node.isLedge*/){
                        continue;
                    }
                }





                //if the NEXT_NODE is at the right of the CURRENT_NOD AND that NEXT_NODE is the RIGHT edge of a platform
                //That could not make a working movement so we need to discard that possibility
                // in other words if the side of the next node (relatively from us) is a platform's particular side
                // don't consider it

                //node RIGHT OF current
                /*if ((currentNode.position.x < node.position.x)){
                    if ((getNodeFor(new Vector2(node.position.x - 1, node.position.y)) != null)) {
                        continue;
                    }
                }

                //node LEFT OF current
                if ((currentNode.position.x > node.position.x)){
                    if ((getNodeFor(new Vector2(node.position.x + 1, node.position.y)) != null)) {
                        //continue;
                    }
                }*/
                reachableNodes.add(node);
            }
        }


        this.reachableNodes = reachableNodes;

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
            int dist = Vectors.manhattanDistance(node.position, position);
            if(dist < closesDistance){
                closesDistance = dist;
                nearest = node;
            }
        }
        return nearest;
    }



    private int getHeuristic(Vector2 current, Vector2 target){


        //TODO tweak the manhanttan euclidianDistance to add a custom cost
        // purely vertical movement are highly expensive
        // diagonal a bit less expansive
        // vertical the least expensive

        return Vectors.manhattanDistance(current, target);
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
            for(Node neighbour : getReachableNodes(current)){
                //if the neighbour has already been evaluated.. well we won't do it a second time right?
                if(!neighbour.isWalkable || this.closedNodes.contains(neighbour)){
                    continue;
                }

                //Estimate a FScore to the neighbour (from the current position to the neighbour)
                int distToNeighbour = current.gCost + getHeuristic(current.position, neighbour.position);

                //If the dist to neighbour is shorter than the euclidianDistance from the start node to the neighbour
                // This is more likely to be a good route OR if it is not something we already consider
                if(distToNeighbour < neighbour.gCost || !openNodes.contains(neighbour)){

                    //Determine cost
                    neighbour.gCost = distToNeighbour;
                    neighbour.hCost = getHeuristic(neighbour.position, endNode.position);
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
